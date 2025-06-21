import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { getLatestTraversalResult } from "@/lib/services/traversal-state";
import { ClaimEvaluationResponse } from "@/lib/types/traversal";

export async function POST(request: NextRequest) {
  try {
    console.log(`📥 [Claim Evaluation API] Received claim evaluation request`);
    
    const latestTraversalResult = await getLatestTraversalResult();
    if (!latestTraversalResult) {
      console.log(`❌ [Claim Evaluation API] No traversal result available`);
      return NextResponse.json(
        { error: "No traversal result available for evaluation. Please run a traversal first." },
        { status: 404 }
      );
    }

    console.log(`📊 [Claim Evaluation API] Preparing legal context...`);
    
    // Extract relevant legal information from the traversal result
    const legalContext = {
      caseInformation: latestTraversalResult.exportMetadata.caseInformation,
      relevantNodes: latestTraversalResult.relevantNodes.map((node: any) => ({
        title: node.title,
        fullContent: node.fullContent,
        metadata: node.metadata,
        relevanceScore: node.relevanceScore,
        reasoning: node.reasoning
      })),
      finalRecommendation: latestTraversalResult.finalRecommendation,
      statistics: latestTraversalResult.statistics
    };

    console.log(`🤖 [Claim Evaluation API] Calling Gemini 2.5 Flash...`);
    
    // Use Gemini 2.5 Flash for claim evaluation
    const model = google("gemini-2.0-flash-exp");
    
    const evaluation = await generateText({
      model,
      prompt: `Given relevant information extracted from the JSON file, please give a step by step formatted logical reasoning written argument as to the validity of the consumer's claim. The reasoning should only rely on and refer to the true text extracted from the acts file, as well as citing exactly where in the consumer act (which section, part chapter number etc.) this information is from. This information all comes from the JSON file which should be provided as context to the LLM agent.

LEGAL CONTEXT FROM TRAVERSAL ANALYSIS:

Case Information:
${JSON.stringify(legalContext.caseInformation, null, 2)}

Relevant Legal Provisions Found:
${legalContext.relevantNodes.map((node: any, index: number) => `
${index + 1}. ${node.title}
   Relevance Score: ${node.relevanceScore?.toFixed(2) || 'N/A'}
   Legal Content: ${node.fullContent}
   AI Reasoning for Inclusion: ${node.reasoning}
   Legal References: ${node.metadata?.legal_references?.join(', ') || 'None specified'}
   Section Information: ${node.metadata?.section_number ? `Section ${node.metadata.section_number}` : 'Section not specified'}
`).join('\n')}

INSTRUCTIONS:
1. Provide a step-by-step logical analysis of the consumer's claim validity
2. Each step must cite specific sections, parts, or chapters from the Consumer Rights Act
3. Quote relevant legal text directly from the provisions above
4. Explain how each provision applies to the specific facts of the case
5. Structure your reasoning as numbered steps
6. Conclude with an overall assessment of claim validity
7. Only use information provided in the legal context above
8. Format the response for easy conversion to PDF

Please provide a comprehensive legal analysis following this structure:

**CONSUMER CLAIM VALIDITY ANALYSIS**

**Case Summary:**
[Brief summary of the consumer's situation]

**Step-by-Step Legal Analysis:**

1. [First legal principle/provision]
2. [Second legal principle/provision]
[Continue as needed]

**Conclusion:**
[Overall assessment of claim validity]

**Legal References Used:**
[List all sections/parts/chapters cited]`
    });

    console.log(`✅ [Claim Evaluation API] Evaluation completed`);
    console.log(`📄 [Claim Evaluation API] Response length: ${evaluation.text.length} characters`);

    return NextResponse.json({
      success: true,
      evaluation: evaluation.text,
      metadata: {
        model: "gemini-2.0-flash-exp",
        relevantNodesAnalyzed: legalContext.relevantNodes.length,
        caseType: legalContext.caseInformation.issue_type || "Consumer Rights",
        evaluationDate: new Date().toISOString(),
        totalCharacters: evaluation.text.length
      }
    });

  } catch (error) {
    console.error("❌ [Claim Evaluation API] Evaluation error:", error);
    return NextResponse.json(
      { 
        error: "Failed to evaluate consumer claim",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 