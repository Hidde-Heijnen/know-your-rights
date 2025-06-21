import { NextRequest, NextResponse } from "next/server";
import { LegalDocumentTraversal } from "@/lib/services/legal-traversal";
import { LegalDocumentTree } from "@/lib/types/traversal";
import { transformRawDocument, validateDocumentTree } from "@/lib/utils/document-transformer";
import { setLatestTraversalResult } from "@/lib/services/traversal-state";
import { promises as fs } from "fs";
import path from "path";

// Cache the document tree to avoid reloading on every request
let cachedDocumentTree: LegalDocumentTree | null = null;

async function loadDocumentTree(): Promise<LegalDocumentTree> {
  if (cachedDocumentTree) {
    return cachedDocumentTree;
  }

  try {
    // Use the new processed consumer rights act JSON file
    const filePath = path.join(process.cwd(), "data", "processed_consumer_rights_act.json");
    console.log(`📂 [API] Loading document from: ${filePath}`);
    
    const fileContent = await fs.readFile(filePath, "utf-8");
    const rawData = JSON.parse(fileContent);
    
    console.log(`📊 [API] Loaded raw data with keys: ${Object.keys(rawData)}`);
    console.log(`📊 [API] Raw data structure - ID: ${rawData.id}, Title: ${rawData.title}, Level: ${rawData.level}`);
    
    // Transform the raw data into our LegalDocumentTree structure
    cachedDocumentTree = transformRawDocument(rawData);
    
    // Validate the transformed structure
    if (!validateDocumentTree(cachedDocumentTree)) {
      throw new Error("Invalid document tree structure after transformation");
    }
    
    console.log(`\n📦 [API] Loaded document tree with ${Object.keys(cachedDocumentTree.nodes).length} nodes and ${cachedDocumentTree.rootNodes.length} root nodes`);
    console.log(`🌳 [API] Root nodes: ${cachedDocumentTree.rootNodes.join(', ')}`);
    
    // Log details about each node for debugging
    console.log(`\n📋 [API] Document tree structure:`);
    Object.entries(cachedDocumentTree.nodes).forEach(([nodeId, node]) => {
      console.log(`   - ${nodeId}: "${node.title}" (Level ${node.level}, ${node.children?.length || 0} children, ${node.content.length} chars)`);
      if (node.children && node.children.length > 0) {
        console.log(`     Children: ${node.children.join(', ')}`);
      }
    });
    
    return cachedDocumentTree;
  } catch (error) {
    console.error("Error loading document tree:", error);
    throw new Error("Failed to load legal documentation");
  }
}

function createExportData(result: any, caseInformation: any, documentTree: LegalDocumentTree) {
  return {
    exportMetadata: {
      exportDate: new Date().toISOString(),
      exportVersion: "1.0",
      caseInformation,
      summary: {
        totalNodesEvaluated: result.traversalPath.length,
        relevantNodesFound: result.relevantNodes.length,
        maxDepthReached: Math.max(...result.traversalPath.map((d: any) => d.depth)),
        averageRelevanceScore: result.traversalPath.reduce((sum: number, d: any) => sum + d.relevanceScore, 0) / result.traversalPath.length,
        traversalDuration: result.traversalPath.length > 0 ? 
          new Date(result.traversalPath[result.traversalPath.length - 1].timestamp).getTime() - 
          new Date(result.traversalPath[0].timestamp).getTime() : 0
      }
    },
    traversalDecisions: result.traversalPath.map((decision: any) => ({
      nodeId: decision.nodeId,
      nodeTitle: documentTree.nodes[decision.nodeId]?.title || "Unknown",
      visited: decision.visited,
      relevanceScore: decision.relevanceScore,
      reasoning: decision.reasoning,
      depth: decision.depth,
      timestamp: decision.timestamp,
      nodeMetadata: {
        level: documentTree.nodes[decision.nodeId]?.level,
        contentLength: documentTree.nodes[decision.nodeId]?.content?.length,
        childrenCount: documentTree.nodes[decision.nodeId]?.children?.length || 0,
        keywords: documentTree.nodes[decision.nodeId]?.metadata?.keywords,
        legalReferences: documentTree.nodes[decision.nodeId]?.metadata?.legal_references,
        mainThemes: documentTree.nodes[decision.nodeId]?.metadata?.main_themes
      }
    })),
    relevantNodes: result.relevantNodes.map((node: any) => ({
      id: node.id,
      title: node.title,
      level: node.level,
      contentPreview: node.content.substring(0, 500) + (node.content.length > 500 ? "..." : ""),
      fullContent: node.content,
      metadata: node.metadata,
      relevanceScore: result.traversalPath.find((d: any) => d.nodeId === node.id)?.relevanceScore,
      reasoning: result.traversalPath.find((d: any) => d.nodeId === node.id)?.reasoning
    })),
    finalRecommendation: result.finalRecommendation,
    statistics: {
      byDepth: Array.from({ length: Math.max(...result.traversalPath.map((d: any) => d.depth)) + 1 }, (_, depth) => {
        const nodesAtDepth = result.traversalPath.filter((d: any) => d.depth === depth);
        const visitedAtDepth = nodesAtDepth.filter((d: any) => d.visited);
        const relevantAtDepth = nodesAtDepth.filter((d: any) => 
          result.relevantNodes.some((rn: any) => rn.id === d.nodeId)
        );
        return {
          depth,
          totalNodes: nodesAtDepth.length,
          visitedNodes: visitedAtDepth.length,
          relevantNodes: relevantAtDepth.length,
          averageScore: nodesAtDepth.reduce((sum: number, d: any) => sum + d.relevanceScore, 0) / nodesAtDepth.length || 0
        };
      }),
      scoreDistribution: {
        highRelevance: result.traversalPath.filter((d: any) => d.relevanceScore >= 0.8).length,
        mediumRelevance: result.traversalPath.filter((d: any) => d.relevanceScore >= 0.5 && d.relevanceScore < 0.8).length,
        lowRelevance: result.traversalPath.filter((d: any) => d.relevanceScore < 0.5).length
      }
    },
    visualization: result.visualization
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log(`\n🚀 [API] Starting new traversal request`);
    const body = await request.json();
    const { caseInformation, maxDepth = 8 } = body;

    console.log(`📋 [API] Request details:`);
    console.log(`   - Case information: ${JSON.stringify(caseInformation, null, 2)}`);
    console.log(`   - Max depth: ${maxDepth}`);

    if (!caseInformation) {
      console.error(`❌ [API] Missing case information`);
      return NextResponse.json(
        { error: "Case information is required" },
        { status: 400 }
      );
    }

    console.log(`📦 [API] Loading document tree...`);
    // Load the document tree
    const documentTree = await loadDocumentTree();
    
    console.log(`🏗️ [API] Creating traversal instance...`);
    // Create traversal instance with higher threshold for more selective node visiting
    const traversal = new LegalDocumentTraversal(documentTree, 0.65);
    
    console.log(`🚀 [API] Starting document traversal...`);
    // Perform the traversal
    const result = await traversal.traverseDocument(caseInformation, maxDepth);
    
    console.log(`📊 [API] Traversal completed. Generating visualization...`);
    // Get visualization for debugging
    const visualization = traversal.getTraversalVisualization(result.traversalPath);
    
    // Create comprehensive export data
    const exportData = createExportData(
      { ...result, visualization }, 
      caseInformation, 
      documentTree
    );
    
    // Store the latest result for export endpoint
    await setLatestTraversalResult(exportData);
    
    console.log(`📤 [API] Sending response:`);
    console.log(`   - Relevant nodes: ${result.relevantNodes.length}`);
    console.log(`   - Traversal decisions: ${result.traversalPath.length}`);
    console.log(`   - Recommendation length: ${result.finalRecommendation?.length || 0} characters`);

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        visualization,
        // Include document nodes for tree visualization
        documentNodes: documentTree.nodes
      },
      exportAvailable: true,
      exportUrl: "/api/traverse/export"
    });
  } catch (error) {
    console.error("❌ [API] Traversal error:", error);
    return NextResponse.json(
      { 
        error: "Failed to traverse legal documentation",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Optional: Add a GET endpoint to retrieve the document structure
export async function GET() {
  try {
    const documentTree = await loadDocumentTree();
    return NextResponse.json({
      totalNodes: Object.keys(documentTree.nodes).length,
      rootNodes: documentTree.rootNodes.length,
      structure: {
        // Return a simplified view of the structure
        roots: documentTree.rootNodes.map(id => ({
          id,
          title: documentTree.nodes[id]?.title || id
        }))
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load document structure" },
      { status: 500 }
    );
  }
}

// Export functions are now handled by traversal-state module 