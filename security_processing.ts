console.log("Welcome to the Return Rights Legal Assistant!");

import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";
import { join } from "path";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import * as readline from "readline";

// Load environment variables from know-your-rights/.env
config({ path: join(process.cwd(), ".env") });

// Load API key from environment variable
const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!API_KEY) {
  throw new Error("GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set");
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(API_KEY);

interface ReturnCase {
  customerName: string;
  purchaseDate: string;
  productName: string;
  purchaseLocation: string;
  purchaseMethod: string;
  productCondition: string;
  returnReason: string;
  storePolicy: string;
  jurisdiction: string;
  additionalDetails: string;
}

interface StructuredCaseSummary {
  caseId: string;
  timestamp: string;
  customer: string;
  product: {
    name: string;
    purchaseDate: string;
    location: string;
    method: string;
    condition: string;
  };
  returnRequest: {
    reason: string;
    jurisdiction: string;
    storePolicy: string;
    additionalDetails: string;
  };
  extractedData: {
    storeName: string;
    storeType: "RETAIL" | "ONLINE" | "HYBRID" | "OTHER";
    productCategory: string;
    returnReasonCategories: ("DEFECTIVE" | "NOT_AS_DESCRIBED" | "CHANGED_MIND" | "WRONG_ITEM" | "OTHER")[];
    jurisdictionType: "US_STATE" | "UK_COUNTRY" | "EU_MEMBER" | "OTHER";
    purchaseMethodCategory: "IN_STORE" | "ONLINE" | "PHONE" | "OTHER";
    timeSincePurchase: number; // in days
  };
  status: string;
}

async function extractRelevantInformation(userAnswer: string, questionType: string): Promise<{ extracted: string; canExtract: boolean; issue?: string }> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `
You are an information extraction assistant. Extract ONLY the relevant information from the user's answer that specifically answers the question asked.

Question Type: ${questionType}
User's Answer: "${userAnswer}"

Instructions:
- Extract ONLY the information that directly answers the question
- Remove any irrelevant details, explanations, or extra context
- Keep the extracted information concise and clear
- If the answer is already concise and relevant, return it as-is
- If the answer is vague or contains extra information, extract the core relevant part

IMPORTANT: If you cannot extract meaningful information from the user's answer, respond with "CANNOT_EXTRACT" followed by a brief explanation of why the answer is insufficient.

Examples:
- Question: "What is your name?" Answer: "My name is John Smith, I'm 30 years old and live in California" → Extract: "John Smith"
- Question: "What product did you purchase?" Answer: "I bought a MacBook Pro laptop from Apple store last week" → Extract: "MacBook Pro"
- Question: "When did you purchase this product?" Answer: "I bought it on January 15th, 2024, it was a Tuesday" → Extract: "January 15, 2024"
- Question: "What is your name?" Answer: "I don't know" → Response: "CANNOT_EXTRACT: The answer does not provide a valid name"
- Question: "What product did you purchase?" Answer: "Something" → Response: "CANNOT_EXTRACT: The answer is too vague to identify a specific product"

Extract the relevant information:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text().trim();
    
    // Check if AI couldn't extract information
    if (responseText.startsWith("CANNOT_EXTRACT")) {
      const issue = responseText.replace("CANNOT_EXTRACT:", "").trim();
      return { extracted: "", canExtract: false, issue };
    }
    
    return { extracted: responseText, canExtract: true };
  } catch (error) {
    console.error("Error extracting information:", error);
    return { extracted: userAnswer, canExtract: false, issue: "AI processing failed" };
  }
}

async function askQuestion(question: string, questionType: string, validationFn?: (answer: string) => { isValid: boolean; message?: string }): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const askWithValidation = async () => {
      rl.question(`${question}\nYour answer: `, async (answer) => {
        const trimmedAnswer = answer.trim();
        
        // Extract relevant information using AI
        console.log("\n🤖 Extracting relevant information...");
        const extractionResult = await extractRelevantInformation(trimmedAnswer, questionType);
        
        if (!extractionResult.canExtract) {
          console.log(`\n❌ ${extractionResult.issue || 'Unable to extract relevant information from your answer.'}`);
          console.log("Please provide a more specific answer.");
          askWithValidation(); // Ask again
          return;
        }
        
        if (extractionResult.extracted !== trimmedAnswer) {
          console.log(`📝 Extracted: "${extractionResult.extracted}"`);
        }
        
        if (validationFn) {
          const validation = validationFn(extractionResult.extracted);
          if (!validation.isValid) {
            console.log(`\n❌ ${validation.message || 'Please provide a more specific answer.'}`);
            askWithValidation(); // Ask again
            return;
          }
        }
        
        rl.close();
        resolve(extractionResult.extracted);
      });
    };
    
    askWithValidation();
  });
}

function validateName(name: string): { isValid: boolean; message?: string } {
  if (name.length < 2) {
    return { isValid: false, message: "Name must be at least 2 characters long." };
  }
  if (name.length > 50) {
    return { isValid: false, message: "Name seems too long. Please provide a shorter name." };
  }
  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    return { isValid: false, message: "Name should only contain letters, spaces, hyphens, and apostrophes." };
  }
  return { isValid: true };
}

function validateProductName(product: string): { isValid: boolean; message?: string } {
  if (product.length < 3) {
    return { isValid: false, message: "Please provide a more specific product name (at least 3 characters)." };
  }
  if (product.length > 100) {
    return { isValid: false, message: "Product name seems too long. Please provide a shorter description." };
  }
  return { isValid: true };
}

function validateDate(date: string): { isValid: boolean; message?: string } {
  if (date.length < 5) {
    return { isValid: false, message: "Please provide a more specific date (e.g., '2024-01-15' or 'January 15, 2024')." };
  }
  
  // Try to parse the date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return { isValid: false, message: "Please provide a valid date format (e.g., '2024-01-15' or 'January 15, 2024')." };
  }
  
  // Check if date is in the future
  if (parsedDate > new Date()) {
    return { isValid: false, message: "Purchase date cannot be in the future." };
  }
  
  return { isValid: true };
}

function validateLocation(location: string): { isValid: boolean; message?: string } {
  if (location.length < 5) {
    return { isValid: false, message: "Please provide a more specific location (e.g., 'Walmart in New York' or 'Amazon.com')." };
  }
  if (location.length > 100) {
    return { isValid: false, message: "Location seems too long. Please provide a shorter description." };
  }
  return { isValid: true };
}

function validatePurchaseMethod(method: string): { isValid: boolean; message?: string } {
  const lowerMethod = method.toLowerCase();
  if (lowerMethod.length < 3) {
    return { isValid: false, message: "Please specify how you purchased (e.g., 'in-store', 'online', 'phone')." };
  }
  return { isValid: true };
}

function validateProductCondition(condition: string): { isValid: boolean; message?: string } {
  if (condition.length < 3) {
    return { isValid: false, message: "Please describe the product condition (e.g., 'new', 'used', 'damaged')." };
  }
  return { isValid: true };
}

function validateReturnReason(reason: string): { isValid: boolean; message?: string } {
  if (reason.length < 5) {
    return { isValid: false, message: "Please provide a more detailed reason for the return." };
  }
  return { isValid: true };
}

function validateJurisdiction(jurisdiction: string): { isValid: boolean; message?: string } {
  if (jurisdiction.length < 3) {
    return { isValid: false, message: "Please provide your location (e.g., 'California', 'UK', 'Germany')." };
  }
  return { isValid: true };
}

function provideExtractionFeedback(field: string, value: string, extractedValue: string): void {
  console.log(`\n✅ Extracted from "${value}":`);
  console.log(`   ${field}: ${extractedValue}`);
}

function categorizeStoreType(location: string): "RETAIL" | "ONLINE" | "HYBRID" | "OTHER" {
  const lowerLocation = location.toLowerCase();
  if (lowerLocation.includes("amazon") || lowerLocation.includes("ebay") || lowerLocation.includes("etsy")) {
    return "ONLINE";
  } else if (lowerLocation.includes("walmart") || lowerLocation.includes("target") || lowerLocation.includes("best buy")) {
    return "HYBRID";
  } else if (lowerLocation.includes("mall") || lowerLocation.includes("store") || lowerLocation.includes("shop")) {
    return "RETAIL";
  }
  return "OTHER";
}

function categorizeProductCategory(productName: string): string {
  const lowerProduct = productName.toLowerCase();
  if (lowerProduct.includes("phone") || lowerProduct.includes("laptop") || lowerProduct.includes("computer") || lowerProduct.includes("macbook") || lowerProduct.includes("iphone")) {
    return "Electronics";
  } else if (lowerProduct.includes("shirt") || lowerProduct.includes("pants") || lowerProduct.includes("dress") || lowerProduct.includes("shoes")) {
    return "Clothing";
  } else if (lowerProduct.includes("book") || lowerProduct.includes("magazine")) {
    return "Books";
  } else if (lowerProduct.includes("food") || lowerProduct.includes("drink")) {
    return "Food & Beverages";
  } else if (lowerProduct.includes("furniture") || lowerProduct.includes("chair") || lowerProduct.includes("table")) {
    return "Home & Garden";
  }
  return "Other";
}

function categorizeReturnReason(reason: string): "DEFECTIVE" | "NOT_AS_DESCRIBED" | "CHANGED_MIND" | "WRONG_ITEM" | "OTHER" {
  const lowerReason = reason.toLowerCase();
  if (lowerReason.includes("defective") || lowerReason.includes("broken") || lowerReason.includes("doesn't work") || lowerReason.includes("not working")) {
    return "DEFECTIVE";
  } else if (lowerReason.includes("not as described") || lowerReason.includes("misrepresented") || lowerReason.includes("different")) {
    return "NOT_AS_DESCRIBED";
  } else if (lowerReason.includes("changed mind") || lowerReason.includes("don't want") || lowerReason.includes("no longer need")) {
    return "CHANGED_MIND";
  } else if (lowerReason.includes("wrong") || lowerReason.includes("incorrect") || lowerReason.includes("mistake")) {
    return "WRONG_ITEM";
  }
  return "OTHER";
}

function categorizeJurisdiction(jurisdiction: string): "US_STATE" | "UK_COUNTRY" | "EU_MEMBER" | "OTHER" {
  const lowerJurisdiction = jurisdiction.toLowerCase();
  if (lowerJurisdiction.includes("uk") || lowerJurisdiction.includes("england") || lowerJurisdiction.includes("scotland") || lowerJurisdiction.includes("wales")) {
    return "UK_COUNTRY";
  } else if (lowerJurisdiction.includes("california") || lowerJurisdiction.includes("new york") || lowerJurisdiction.includes("texas") || lowerJurisdiction.includes("florida")) {
    return "US_STATE";
  } else if (lowerJurisdiction.includes("germany") || lowerJurisdiction.includes("france") || lowerJurisdiction.includes("spain") || lowerJurisdiction.includes("italy")) {
    return "EU_MEMBER";
  }
  return "OTHER";
}

function categorizePurchaseMethod(method: string): "IN_STORE" | "ONLINE" | "PHONE" | "OTHER" {
  const lowerMethod = method.toLowerCase();
  if (lowerMethod.includes("online") || lowerMethod.includes("website") || lowerMethod.includes("app")) {
    return "ONLINE";
  } else if (lowerMethod.includes("phone") || lowerMethod.includes("call")) {
    return "PHONE";
  } else if (lowerMethod.includes("store") || lowerMethod.includes("in person")) {
    return "IN_STORE";
  }
  return "OTHER";
}

function calculateDaysSincePurchase(purchaseDate: string): number {
  try {
    const purchase = new Date(purchaseDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - purchase.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (error) {
    return 0;
  }
}

function extractStoreName(location: string): string {
  // Simple extraction - take the first part before common location words
  const locationParts = location.split(/[,\s]+/);
  if (locationParts.length > 0 && locationParts[0]) {
    return locationParts[0];
  }
  return "Unknown";
}

function saveCaseToFile(caseSummary: StructuredCaseSummary): void {
  try {
    // Create cases directory if it doesn't exist
    const casesDir = join(process.cwd(), "cases");
    if (!existsSync(casesDir)) {
      mkdirSync(casesDir, { recursive: true });
    }

    // Save the case file
    const filename = `${caseSummary.caseId}.json`;
    const filepath = join(casesDir, filename);
    writeFileSync(filepath, JSON.stringify(caseSummary, null, 2));
    
    console.log(`\n✅ Case saved to: ${filepath}`);
  } catch (error) {
    console.error("Error saving case file:", error);
  }
}

async function extractReturnReasonCategories(reason: string): Promise<("DEFECTIVE" | "NOT_AS_DESCRIBED" | "CHANGED_MIND" | "WRONG_ITEM" | "OTHER")[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `
Analyze the user's return reason and identify ALL applicable categories from the following list:

Categories:
- DEFECTIVE: Product doesn't work, is broken, faulty, malfunctioning, defective
- NOT_AS_DESCRIBED: Product doesn't match description, misrepresented, different from advertised
- CHANGED_MIND: Changed mind, don't want it anymore, no longer need it, buyer's remorse
- WRONG_ITEM: Wrong size, color, model, item received, incorrect item
- OTHER: Any other reason not covered above

User's Return Reason: "${reason}"

Instructions:
- Identify ALL categories that apply to this return reason
- A single return reason can have multiple categories
- Return ONLY the category names separated by commas
- If no specific categories match, return "OTHER"

Examples:
- "The product is broken and doesn't work" → "DEFECTIVE"
- "It's not the right size and I changed my mind" → "WRONG_ITEM,CHANGED_MIND"
- "It's defective and not as described" → "DEFECTIVE,NOT_AS_DESCRIBED"
- "I don't like the color" → "CHANGED_MIND"
- "Wrong model received" → "WRONG_ITEM"
- "I just don't want it anymore" → "CHANGED_MIND"

Return the applicable categories:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text().trim();
    
    // Parse the comma-separated categories
    const categories = responseText.split(',').map(cat => cat.trim().toUpperCase());
    
    // Validate categories
    const validCategories: ("DEFECTIVE" | "NOT_AS_DESCRIBED" | "CHANGED_MIND" | "WRONG_ITEM" | "OTHER")[] = [];
    for (const category of categories) {
      if (category === "DEFECTIVE" || category === "NOT_AS_DESCRIBED" || category === "CHANGED_MIND" || category === "WRONG_ITEM" || category === "OTHER") {
        validCategories.push(category);
      }
    }
    
    // If no valid categories found, default to OTHER
    return validCategories.length > 0 ? validCategories : ["OTHER"];
  } catch (error) {
    console.error("Error extracting return reason categories:", error);
    return ["OTHER"];
  }
}

async function startReturnRightsAssistant() {
  console.log("\n=== RETURN REQUEST FORM ===\n");
  console.log("I'll help you create a standardized return request form.");
  console.log("Let me gather information about your return request.\n");

  const caseData: ReturnCase = {
    customerName: "",
    purchaseDate: "",
    productName: "",
    purchaseLocation: "",
    purchaseMethod: "",
    productCondition: "",
    returnReason: "",
    storePolicy: "",
    jurisdiction: "",
    additionalDetails: ""
  };

  try {
    // Gather basic information with validation and AI extraction
    caseData.customerName = await askQuestion("What is your name?", "customer_name", validateName);
    provideExtractionFeedback("Customer Name", caseData.customerName, caseData.customerName);
    
    caseData.productName = await askQuestion("What product did you purchase?", "product_name", validateProductName);
    provideExtractionFeedback("Product Name", caseData.productName, caseData.productName);
    
    caseData.purchaseDate = await askQuestion("When did you purchase this product? (Please provide the date)", "purchase_date", validateDate);
    provideExtractionFeedback("Purchase Date", caseData.purchaseDate, caseData.purchaseDate);
    
    caseData.purchaseLocation = await askQuestion("Where did you purchase this product? (Store name and location)", "purchase_location", validateLocation);
    const extractedStoreName = extractStoreName(caseData.purchaseLocation);
    const categorizedStoreType = categorizeStoreType(caseData.purchaseLocation);
    provideExtractionFeedback("Store Name", caseData.purchaseLocation, extractedStoreName);
    provideExtractionFeedback("Store Type", caseData.purchaseLocation, categorizedStoreType);
    
    const purchaseMethod = await askQuestion("How did you purchase this product? (in-store, online, phone, etc.)", "purchase_method", validatePurchaseMethod);
    caseData.purchaseMethod = purchaseMethod;
    const categorizedPurchaseMethod = categorizePurchaseMethod(purchaseMethod);
    provideExtractionFeedback("Purchase Method", purchaseMethod, categorizedPurchaseMethod);

    // Product condition and usage
    caseData.productCondition = await askQuestion("What is the current condition of the product? (new, used, damaged, etc.)", "product_condition", validateProductCondition);
    provideExtractionFeedback("Product Condition", caseData.productCondition, caseData.productCondition);
    
    // Return reason
    console.log("\nWhat is your reason for wanting to return this product?");
    console.log("1. Product is defective or doesn't work");
    console.log("2. Product is not as described or advertised");
    console.log("3. Changed my mind / no longer want it");
    console.log("4. Wrong size, color, or model received");
    console.log("5. Other reason");
    
    const reasonChoice = await askQuestion("Please enter the number (1-5) or describe your reason:", "return_reason", validateReturnReason);
    caseData.returnReason = reasonChoice;
    
    // Extract multiple return reason categories using AI
    console.log("\n🤖 Analyzing return reason categories...");
    const returnReasonCategories = await extractReturnReasonCategories(reasonChoice);
    provideExtractionFeedback("Return Reason Categories", reasonChoice, returnReasonCategories.join(", "));

    // Store policy
    caseData.storePolicy = await askQuestion("What is the store's return policy? (if you know it)", "store_policy");
    if (caseData.storePolicy) {
      provideExtractionFeedback("Store Policy", caseData.storePolicy, caseData.storePolicy);
    } else {
      console.log("\nℹ️  No store policy provided - will be marked as unknown");
    }

    // Jurisdiction
    caseData.jurisdiction = await askQuestion("What state/province/country are you located in? (for applicable laws)", "jurisdiction", validateJurisdiction);
    const categorizedJurisdiction = categorizeJurisdiction(caseData.jurisdiction);
    provideExtractionFeedback("Jurisdiction Type", caseData.jurisdiction, categorizedJurisdiction);

    // Additional details
    caseData.additionalDetails = await askQuestion("Please provide any additional details about your situation:", "additional_details");
    if (caseData.additionalDetails) {
      provideExtractionFeedback("Additional Details", caseData.additionalDetails, caseData.additionalDetails);
    } else {
      console.log("\nℹ️  No additional details provided");
    }

    // Extract and categorize product information
    const productCategory = categorizeProductCategory(caseData.productName);
    const timeSincePurchase = calculateDaysSincePurchase(caseData.purchaseDate);
    
    provideExtractionFeedback("Product Category", caseData.productName, productCategory);
    provideExtractionFeedback("Days Since Purchase", caseData.purchaseDate, `${timeSincePurchase} days`);

    console.log("\n=== PROCESSING YOUR REQUEST ===\n");
    console.log("Creating your standardized return request form...\n");
    
    // Create structured summary with categorized data
    const structuredSummary: StructuredCaseSummary = {
      caseId: `RETURN_${Date.now()}`,
      timestamp: new Date().toISOString(),
      customer: caseData.customerName,
      product: {
        name: caseData.productName,
        purchaseDate: caseData.purchaseDate,
        location: caseData.purchaseLocation,
        method: caseData.purchaseMethod,
        condition: caseData.productCondition
      },
      returnRequest: {
        reason: caseData.returnReason,
        jurisdiction: caseData.jurisdiction,
        storePolicy: caseData.storePolicy,
        additionalDetails: caseData.additionalDetails
      },
      extractedData: {
        storeName: extractedStoreName,
        storeType: categorizedStoreType,
        productCategory: productCategory,
        returnReasonCategories: returnReasonCategories,
        jurisdictionType: categorizedJurisdiction,
        purchaseMethodCategory: categorizedPurchaseMethod,
        timeSincePurchase: timeSincePurchase
      },
      status: "SUBMITTED"
    };

    console.log("=== YOUR RETURN REQUEST SUMMARY ===\n");
    console.log(JSON.stringify(structuredSummary, null, 2));
    
    // Save case to file
    saveCaseToFile(structuredSummary);
    
    console.log("\n=== NEXT STEPS ===\n");
    console.log("1. Review your return request summary above");
    console.log("2. Contact the store with your case details");
    console.log("3. Keep all documentation and correspondence");
    console.log("4. Your request has been saved for future reference");
    
    console.log("\nThank you for using the Return Request Form!");
    
  } catch (error) {
    console.error("An error occurred during the process:", error);
    console.log("Please try again or contact support if the issue persists.");
  }
}

// Start the assistant
startReturnRightsAssistant();
