import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// Helper function to get human-readable labels for categorical values
function getOptionLabel(value: string, context: string): string {
  const labelMaps: Record<string, Record<string, string>> = {
    yesNo: {
      yes: "Yes",
      no: "No",
    },
    contractMain: {
      goods: "Tangible goods",
      digital: "Digital content",
      service: "A service",
      mix: "A mix of these",
    },
    contractType: {
      one_off: "One-off sale",
      hire: "Hire of goods",
      hire_purchase: "Hire-purchase",
      transfer: "Transfer for something other than money",
    },
    purchaseMethod: {
      in_person: "In person",
      online: "Online / distance",
      off_premises: "Off-premises / doorstep",
    },
  };

  return labelMaps[context]?.[value] || value;
}

async function filterIssueDescription(description: string, screeningData: any): Promise<string> {
  if (!genAI) {
    console.warn("AI not available, returning original description");
    return description;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Build context from screening data
    const context = {
      purchase_uk: screeningData.purchase_uk ? getOptionLabel(screeningData.purchase_uk, "yesNo") : "Unknown",
      acting_personal: screeningData.acting_personal ? getOptionLabel(screeningData.acting_personal, "yesNo") : "Unknown",
      seller_trader: screeningData.seller_trader ? getOptionLabel(screeningData.seller_trader, "yesNo") : "Unknown",
      receive_date: screeningData.receive_date ? new Date(screeningData.receive_date).toLocaleDateString() : "Unknown",
      contract_main: screeningData.contract_main ? getOptionLabel(screeningData.contract_main, "contractMain") : "Unknown",
      contract_type: screeningData.contract_type ? getOptionLabel(screeningData.contract_type, "contractType") : "Unknown",
      auction: screeningData.auction ? getOptionLabel(screeningData.auction, "yesNo") : "Unknown",
      purchase_method: screeningData.purchase_method ? getOptionLabel(screeningData.purchase_method, "purchaseMethod") : "Unknown",
    };
    
    const prompt = `
You are a content filtering assistant for a UK consumer rights legal system. Your task is to extract ONLY the relevant technical/legal issue information from a user's description while removing personal information and potentially biased details.

CONTEXT FROM PREVIOUS QUESTIONS:
- Purchase in UK: ${context.purchase_uk}
- Acting for personal purposes: ${context.acting_personal}
- Seller acting for business: ${context.seller_trader}
- Receive date: ${context.receive_date}
- Contract type: ${context.contract_main}
- Contract arrangement: ${context.contract_type}
- Purchased at auction: ${context.auction}
- Purchase method: ${context.purchase_method}

Original Description: "${description}"

Instructions:
- Extract ONLY the core technical/legal problem or issue
- Remove personal information (names, locations, specific product details like colors, brands, etc.)
- Remove subjective opinions, emotions, or potentially biased language
- Remove irrelevant details that don't relate to the actual problem
- Keep only factual, objective information about what went wrong
- Focus on the functional/technical aspects of the issue
- Consider the context (contract type, purchase method, etc.) when categorizing the issue
- Format output as: "[Contract Type], [Specific Issue Category], [Technical Problem]"

Examples based on context:
- Context: Contract type: Tangible goods, Purchase method: Online → Input: "My red iPhone 14 from Apple Store in London is broken and I'm really upset about it" → Output: "Tangible goods, mobile phone, is not functioning properly"
- Context: Contract type: Digital content, Purchase method: Online → Input: "The tax software I bought online is outdated and doesn't work properly" → Output: "Digital content, software, is not functioning properly and outdated"
- Context: Contract type: A service, Purchase method: In person → Input: "The cleaning service I hired is terrible and they didn't show up" → Output: "A service, cleaning service, service not provided as agreed"
- Context: Contract type: Tangible goods, Purchase method: Off-premises → Input: "The white MacBook Pro from John's store is overheating and shutting down" → Output: "Tangible goods, computer, is overheating and shutting down"

Extract the relevant, unbiased issue information:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error filtering issue description:", error);
    return description; // Fallback to original if AI fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Filter the issue description to remove personal/bias information
    // Now passing all screening data for context
    if (data.issue_description) {
      data.issue_description_filtered = await filterIssueDescription(data.issue_description, data);
    }
    
    // Create a timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screening_${timestamp}.json`;
    
    // Create the data directory if it doesn't exist
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    
    // Prepare the data to save
    const dataToSave = {
      id: `screening_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    // Save the file
    const filepath = join(dataDir, filename);
    writeFileSync(filepath, JSON.stringify(dataToSave, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      message: 'Screening data saved successfully',
      filename: filename,
      filepath: filepath,
      originalDescription: data.issue_description,
      filteredDescription: data.issue_description_filtered
    });
    
  } catch (error) {
    console.error('Error saving screening data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save screening data' },
      { status: 500 }
    );
  }
} 