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

        const prompt = `You are a legal assistant helping to filter potentially biased or personal information from user descriptions of legal issues.

Context from previous answers:
- Eligibility: ${eligibility_check}
- Contract main: ${contract_main}
- Contract type: ${contract_type}
- Purchase method: ${purchase_method}
- Receive date: ${receive_date}

Please filter the following issue description to remove:
1. Personal identifying information (names, addresses, phone numbers, etc.)
2. Potentially biased language or subjective opinions
3. Emotional language that could affect impartial processing
4. Unnecessary details that don't relate to the core legal issue

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