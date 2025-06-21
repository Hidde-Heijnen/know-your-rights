import { NextRequest, NextResponse } from "next/server";
import { getLatestTraversalResult } from "@/lib/services/traversal-state";

export async function GET(request: NextRequest) {
  try {
    console.log(`📥 [Export API] Received export request`);
    
    const latestTraversalResult = await getLatestTraversalResult();
    if (!latestTraversalResult) {
      console.log(`❌ [Export API] No traversal result available for export`);
      return NextResponse.json(
        { error: "No traversal result available for export. Please run a traversal first." },
        { status: 404 }
      );
    }

    console.log(`📊 [Export API] Preparing export data...`);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `legal-traversal-export-${timestamp}.json`;
    
    // Create the JSON string with proper formatting
    const jsonData = JSON.stringify(latestTraversalResult, null, 2);
    
    console.log(`📤 [Export API] Exporting data:`);
    console.log(`   - Filename: ${filename}`);
    console.log(`   - Total decisions: ${latestTraversalResult.traversalDecisions?.length || 0}`);
    console.log(`   - Relevant nodes: ${latestTraversalResult.relevantNodes?.length || 0}`);
    console.log(`   - Export size: ${(jsonData.length / 1024).toFixed(2)} KB`);

    // Create response with appropriate headers for file download
    const response = new NextResponse(jsonData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': jsonData.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    return response;
    
  } catch (error) {
    console.error("❌ [Export API] Export error:", error);
    return NextResponse.json(
      { 
        error: "Failed to export traversal data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format = 'json', includeFullContent = true, includeMetadata = true } = body;
    
    console.log(`📥 [Export API] Received custom export request with format: ${format}`);
    
    const latestTraversalResult = await getLatestTraversalResult();
    if (!latestTraversalResult) {
      return NextResponse.json(
        { error: "No traversal result available for export. Please run a traversal first." },
        { status: 404 }
      );
    }

    let exportData = { ...latestTraversalResult };
    
    // Apply export options
    if (!includeFullContent) {
      exportData.relevantNodes = exportData.relevantNodes.map((node: any) => {
        const { fullContent, ...nodeWithoutContent } = node;
        return nodeWithoutContent;
      });
    }
    
    if (!includeMetadata) {
      exportData.traversalDecisions = exportData.traversalDecisions.map((decision: any) => {
        const { nodeMetadata, ...decisionWithoutMetadata } = decision;
        return decisionWithoutMetadata;
      });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    let filename: string;
    let responseData: string;
    let contentType: string;

    switch (format.toLowerCase()) {
      case 'csv':
        // Convert to CSV format (simplified)
        filename = `legal-traversal-export-${timestamp}.csv`;
        contentType = 'text/csv';
        const csvHeaders = 'NodeID,Title,Visited,RelevanceScore,Depth,Reasoning\n';
        const csvRows = exportData.traversalDecisions.map((decision: any) => 
          `"${decision.nodeId}","${decision.nodeTitle}","${decision.visited}","${decision.relevanceScore}","${decision.depth}","${decision.reasoning.replace(/"/g, '""')}"`
        ).join('\n');
        responseData = csvHeaders + csvRows;
        break;
        
      case 'summary':
        // Create a summary-only export
        filename = `legal-traversal-summary-${timestamp}.json`;
        contentType = 'application/json';
        responseData = JSON.stringify({
          exportMetadata: exportData.exportMetadata,
          summary: exportData.exportMetadata.summary,
          statistics: exportData.statistics,
          relevantNodesTitles: exportData.relevantNodes.map((node: any) => ({
            id: node.id,
            title: node.title,
            relevanceScore: node.relevanceScore
          })),
          finalRecommendation: exportData.finalRecommendation
        }, null, 2);
        break;
        
      default: // json
        filename = `legal-traversal-export-${timestamp}.json`;
        contentType = 'application/json';
        responseData = JSON.stringify(exportData, null, 2);
    }

    console.log(`📤 [Export API] Custom export prepared:`);
    console.log(`   - Format: ${format}`);
    console.log(`   - Filename: ${filename}`);
    console.log(`   - Size: ${(responseData.length / 1024).toFixed(2)} KB`);

    return new NextResponse(responseData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': responseData.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error("❌ [Export API] Custom export error:", error);
    return NextResponse.json(
      { 
        error: "Failed to export traversal data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 