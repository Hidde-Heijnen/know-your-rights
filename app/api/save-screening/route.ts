import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received data:', body);

    const {
      eligibility_check,
      receive_date,
      contract_main,
      contract_type,
      purchase_method,
      issue_description,
      ...otherFields
    } = body;

    // Filter the issue description using AI
    let filteredDescription = issue_description;
    if (issue_description) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const prompt = `You are a content filtering assistant for a UK consumer rights legal system. Your task is to extract ONLY the relevant technical/legal issue information from a user's description while removing personal information and potentially biased details.

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

Keep only the factual, objective details relevant to the legal claim.

Original description: "${issue_description}"

Return ONLY the filtered description without any explanations or additional text. If the description is already appropriate, return it unchanged.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const filteredText = response.text().trim();

        // Check if AI returned an error indicator
        if (filteredText.includes('CANNOT_EXTRACT') || filteredText.includes('ERROR')) {
          console.log('AI could not process description, using original');
          filteredDescription = issue_description;
        } else {
          filteredDescription = filteredText;
        }

        console.log('Filtered description:', filteredDescription);
      } catch (aiError) {
        console.error('AI filtering failed:', aiError);
        // Fallback to original description
        filteredDescription = issue_description;
      }
    }

    // Prepare data for saving
    const dataToSave = {
      timestamp: new Date().toISOString(),
      eligibility_check,
      receive_date,
      contract_main,
      contract_type,
      purchase_method,
      issue_description,
      issue_description_filtered: filteredDescription,
      ...otherFields
    };

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screening_${timestamp}.json`;
    const filepath = path.join(dataDir, filename);

    // Save to file
    fs.writeFileSync(filepath, JSON.stringify(dataToSave, null, 2));
    console.log('Data saved to:', filepath);

    return NextResponse.json({
      success: true,
      message: 'Screening data saved successfully',
      filteredDescription,
      filename
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 