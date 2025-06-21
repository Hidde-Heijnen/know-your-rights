import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type { 
  LegalNode, 
  LegalDocumentTree, 
  TraversalContext, 
  TraversalDecision, 
  TraversalResult,
  TraversalStep 
} from "../types/traversal";

// New interface for batch evaluation results
interface BatchEvaluationResult {
  nodeEvaluations: {
    nodeId: string;
    isRelevant: boolean;
    relevanceScore: number;
    reasoning: string;
    shouldExploreChildren: boolean;
  }[];
}

export class LegalDocumentTraversal {
  private documentTree: LegalDocumentTree;
  private model = google("gemini-2.0-flash-exp");
  private relevanceThreshold: number;

  constructor(documentTree: LegalDocumentTree, relevanceThreshold: number = 0.3) {
    this.documentTree = documentTree;
    this.relevanceThreshold = relevanceThreshold;
    console.log(`🎯 [Legal Traversal] Relevance threshold set to: ${this.relevanceThreshold}`);
  }

  // Helper method to extract meaningful context from node text
  private extractContextualPreview(text: string, maxLength: number = 150): string {
    if (!text) return "";
    
    // First try to get first sentence
    const firstSentence = text.split(/[.!?]/)[0].trim();
    
    // If first sentence is too short, try to get more context
    if (firstSentence.length < 20 && text.length > firstSentence.length) {
      // Get first two sentences or up to maxLength
      const sentences = text.split(/[.!?]/).slice(0, 2);
      const preview = sentences.join('. ').trim();
      return preview.length > maxLength ? preview.substring(0, maxLength) + '...' : preview;
    }
    
    // If first sentence is good length, use it
    if (firstSentence.length <= maxLength) {
      return firstSentence + (firstSentence !== text ? '...' : '');
    }
    
    // If first sentence is too long, truncate it
    return firstSentence.substring(0, maxLength) + '...';
  }

  // Helper method to extract enhanced node context for better AI evaluation
  private extractEnhancedNodeContext(node: LegalNode): string {
    const parts: string[] = [];
    
    // Add title
    parts.push(`Title: ${node.title}`);
    
    // For leaf nodes (no children), use minimal context - just title is sufficient
    const isLeafNode = !node.children || node.children.length === 0;
    
    if (isLeafNode) {
      // For leaf nodes, title alone provides sufficient context and maximizes token savings
      parts.push(`Type: Leaf node (detailed provision)`);
    } else {
      // For parent nodes, provide richer context since they guide traversal decisions
      parts.push(`Content: ${this.extractContextualPreview(node.content, 150)}`);
      
      // Add metadata for parent nodes to help with traversal decisions
      if (node.metadata?.main_themes?.length) {
        parts.push(`Main themes: ${node.metadata.main_themes.join(', ')}`);
      }
      
      if (node.metadata?.key_points?.length) {
        parts.push(`Key points: ${node.metadata.key_points.slice(0, 3).join('; ')}`);
      }
      
      if (node.metadata?.scope) {
        parts.push(`Scope: ${this.extractContextualPreview(node.metadata.scope, 100)}`);
      }
      
      if (node.metadata?.practical_impact) {
        parts.push(`Impact: ${this.extractContextualPreview(node.metadata.practical_impact, 80)}`);
      }
      
      parts.push(`Type: Parent node (${node.children?.length || 0} children)`);
    }
    
    return parts.join(' | ');
  }

  async traverseDocument(
    caseInformation: any,
    maxDepth: number = 8
  ): Promise<TraversalResult> {
    console.log("🚀 [Legal Traversal] Starting document traversal...");
    console.log("📋 [Legal Traversal] Case information:", JSON.stringify(caseInformation, null, 2));
    console.log("🔢 [Legal Traversal] Max depth:", maxDepth);
    console.log("🌳 [Legal Traversal] Available root nodes:", this.documentTree.rootNodes);
    console.log("📊 [Legal Traversal] Total nodes in tree:", Object.keys(this.documentTree.nodes).length);

    const context: TraversalContext = {
      caseInformation,
      visitedNodes: new Set(),
      decisions: [],
      currentDepth: 0,
      maxDepth
    };

    // Start with root nodes
    const queue: Array<{ nodeId: string; depth: number }> = 
      this.documentTree.rootNodes.map(id => ({ nodeId: id, depth: 0 }));

    console.log("📥 [Legal Traversal] Initial queue:", queue);

    const relevantNodes: LegalNode[] = [];

    // Breadth-first search traversal - process level by level
    for (let currentDepth = 0; currentDepth < maxDepth; currentDepth++) {
      console.log(`\n🔍 [Legal Traversal] Processing depth ${currentDepth}`);
      
      // Get all nodes at the current depth
      const currentLevel = queue.filter(item => item.depth === currentDepth);
      console.log(`📥 [Legal Traversal] Current queue length: ${queue.length}`);
      console.log(`📊 [Legal Traversal] Nodes at current depth: ${currentLevel.length}`);
      console.log(`📋 [Legal Traversal] Current level nodes:`, currentLevel.map(item => ({
        nodeId: item.nodeId,
        title: this.documentTree.nodes[item.nodeId]?.title || 'Unknown'
      })));
      
      // If no nodes at this depth, we're done
      if (currentLevel.length === 0) {
        console.log(`⬆️ [Legal Traversal] No nodes at depth ${currentDepth}, traversal complete`);
        break;
      }

      // Update context depth for accurate logging
      context.currentDepth = currentDepth;

      // Batch evaluate all nodes at current depth in a single call
      console.log(`🔄 [Legal Traversal] Batch evaluating ${currentLevel.length} nodes in a single call...`);
      const levelDecisions = await this.batchEvaluateNodes(
        currentLevel.map(item => item.nodeId), 
        context
      );

      console.log(`📊 [Legal Traversal] Batch evaluation results:`);
      levelDecisions.forEach(decision => {
        const node = this.documentTree.nodes[decision.nodeId];
        console.log(`   - ${decision.nodeId} ("${node?.title || 'Unknown'}"): ${decision.relevanceScore.toFixed(2)} score, visited: ${decision.visited}`);
        console.log(`     Reasoning: ${decision.reasoning}`);
      });

      // Process decisions and add children for next level
      let childrenAdded = 0;
      let relevantAtLevel = 0;
      let skippedLowScore = 0;
      let exploredForChildren = 0;
      
      for (const decision of levelDecisions) {
        // FIXED LOGIC: Separate relevance assessment from child exploration
        // A node is relevant if it meets the score threshold, regardless of whether we explore its children
        if (decision.relevanceScore > this.relevanceThreshold) {
          relevantAtLevel++;
          const node = this.documentTree.nodes[decision.nodeId];
          if (node) {
            console.log(`✅ [Legal Traversal] Adding relevant node: ${decision.nodeId} - "${node.title}" (score: ${decision.relevanceScore.toFixed(2)})`);
            relevantNodes.push(node);
          }
        } else {
          skippedLowScore++;
          console.log(`❌ [Legal Traversal] Skipping low-scoring node ${decision.nodeId} (score: ${decision.relevanceScore.toFixed(2)}, threshold: ${this.relevanceThreshold})`);
          console.log(`   Reason: ${decision.reasoning}`);
        }

        // SEPARATE DECISION: Whether to explore children (based on visited flag)
        if (decision.visited) {
          exploredForChildren++;
          const node = this.documentTree.nodes[decision.nodeId];
          if (node) {
            // Add children to queue for next level (if within depth limit)
            if (node.children && node.children.length > 0 && currentDepth + 1 < maxDepth) {
              console.log(`👥 [Legal Traversal] Exploring children of node ${decision.nodeId} - adding ${node.children.length} children`);
              for (const childId of node.children) {
                if (!context.visitedNodes.has(childId)) {
                  console.log(`   + Adding child: ${childId} - "${this.documentTree.nodes[childId]?.title || 'Unknown'}"`);
                  queue.push({ nodeId: childId, depth: currentDepth + 1 });
                  childrenAdded++;
                } else {
                  console.log(`   - Skipping already visited child: ${childId}`);
                }
              }
            } else if (node.children && node.children.length > 0) {
              console.log(`📄 [Legal Traversal] Node ${decision.nodeId} has ${node.children.length} children, but max depth reached`);
            } else {
              console.log(`📄 [Legal Traversal] Node ${decision.nodeId} has no children to explore`);
            }
          }
        } else {
          console.log(`🔍 [Legal Traversal] Not exploring children of node ${decision.nodeId} (AI decided not to explore further)`);
          console.log(`   Reason: ${decision.reasoning}`);
        }
        
        context.decisions.push(decision);
        context.visitedNodes.add(decision.nodeId);
      }
      
      console.log(`📊 [Legal Traversal] Level ${currentDepth} summary:`);
      console.log(`   - Relevant nodes: ${relevantAtLevel}`);
      console.log(`   - Skipped (low score): ${skippedLowScore}`);
      console.log(`   - Explored for children: ${exploredForChildren}`);
      console.log(`   - Children added for next level: ${childrenAdded}`);

      console.log(`📈 [Legal Traversal] Added ${childrenAdded} new nodes to queue for next level`);
      console.log(`📊 [Legal Traversal] Total relevant nodes found so far: ${relevantNodes.length}`);

      // Remove processed nodes from queue (all nodes at current depth)
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].depth === currentDepth) {
          queue.splice(i, 1);
        }
      }
      console.log(`🗑️ [Legal Traversal] Removed ${currentLevel.length} processed nodes from queue`);
      console.log(`📥 [Legal Traversal] Remaining queue length: ${queue.length}`);
    }

    console.log(`\n🏁 [Legal Traversal] Traversal complete!`);
    console.log(`📊 [Legal Traversal] Final statistics:`);
    console.log(`   - Relevant nodes found: ${relevantNodes.length}`);
    console.log(`   - Total decisions made: ${context.decisions.length}`);
    console.log(`   - Nodes visited: ${context.visitedNodes.size}`);
    console.log(`   - Final depth reached: ${context.currentDepth}`);
    console.log(`   - Max depth limit: ${maxDepth}`);
    console.log(`   - Remaining queue items: ${queue.length}`);
    
    console.log(`📋 [Legal Traversal] Relevant nodes:`);
    relevantNodes.forEach((node, index) => {
      console.log(`   ${index + 1}. ${node.id} - "${node.title}" (Level ${node.level})`);
      console.log(`      Content preview: "${node.content.substring(0, 100)}..."`);
    });

    console.log(`🎯 [Legal Traversal] Generating final recommendation...`);
    const finalRecommendation = await this.generateFinalRecommendation(relevantNodes, context);
    console.log(`✅ [Legal Traversal] Final recommendation generated (${finalRecommendation.length} characters)`);

    return {
      relevantNodes,
      traversalPath: context.decisions,
      finalRecommendation
    };
  }

  // NEW: Batch evaluation method that evaluates multiple nodes in a single LLM call
  private async batchEvaluateNodes(
    nodeIds: string[],
    context: TraversalContext
  ): Promise<TraversalDecision[]> {
    console.log(`🔎 [Batch Evaluation] Evaluating ${nodeIds.length} nodes in batch: ${nodeIds.join(', ')}`);
    
    // If batch is too large, split into smaller chunks to avoid API limits and prompt complexity
    const MAX_BATCH_SIZE = 5;
    if (nodeIds.length > MAX_BATCH_SIZE) {
      console.log(`📦 [Batch Evaluation] Large batch detected (${nodeIds.length} nodes). Splitting into chunks of ${MAX_BATCH_SIZE}...`);
      
      const allDecisions: TraversalDecision[] = [];
      const chunks = [];
      
      // Split nodeIds into chunks
      for (let i = 0; i < nodeIds.length; i += MAX_BATCH_SIZE) {
        chunks.push(nodeIds.slice(i, i + MAX_BATCH_SIZE));
      }
      
      console.log(`📦 [Batch Evaluation] Created ${chunks.length} chunks: ${chunks.map(chunk => chunk.length).join(', ')} nodes each`);
      
      // Process each chunk sequentially to avoid overwhelming the API
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🔄 [Batch Evaluation] Processing chunk ${i + 1}/${chunks.length} with ${chunk.length} nodes...`);
        
        const chunkDecisions = await this.evaluateBatchChunk(chunk, context);
        allDecisions.push(...chunkDecisions);
        
        // Add a small delay between chunks to be respectful to the API
        if (i < chunks.length - 1) {
          console.log(`⏳ [Batch Evaluation] Waiting 1 second before next chunk...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`✅ [Batch Evaluation] Completed all ${chunks.length} chunks. Total decisions: ${allDecisions.length}`);
      return allDecisions;
    }
    
    // For smaller batches, use the original logic
    return this.evaluateBatchChunk(nodeIds, context);
  }

  // Helper method to evaluate a single chunk of nodes
  private async evaluateBatchChunk(
    nodeIds: string[],
    context: TraversalContext
  ): Promise<TraversalDecision[]> {
    console.log(`🔎 [Batch Chunk] Evaluating ${nodeIds.length} nodes: ${nodeIds.join(', ')}`);
    
    // Filter out nodes that don't exist
    const validNodes = nodeIds
      .map(nodeId => ({ nodeId, node: this.documentTree.nodes[nodeId] }))
      .filter(({ node }) => node !== undefined);

    if (validNodes.length === 0) {
      console.error(`❌ [Batch Chunk] No valid nodes found in chunk`);
      return nodeIds.map(nodeId => ({
        nodeId,
        visited: false,
        reasoning: "Node not found in document tree",
        relevanceScore: 0,
        timestamp: new Date(),
        depth: context.currentDepth
      }));
    }

    console.log(`📋 [Batch Chunk] Processing ${validNodes.length} valid nodes`);
    
    // Log the contextual information we're sending
    validNodes.forEach(({ nodeId, node }, index) => {
      const enhancedContext = this.extractEnhancedNodeContext(node!);
      console.log(`   ${index + 1}. ${nodeId}: ${enhancedContext}`);
    });
    
    const previousRelevantNodes = context.decisions
      .filter(d => d.relevanceScore > this.relevanceThreshold)
      .map(d => this.documentTree.nodes[d.nodeId]?.title)
      .join(", ");
    
    console.log(`📚 [Batch Chunk] Previous relevant nodes: ${previousRelevantNodes || "None"}`);
    console.log(`🤖 [Batch Chunk] Sending chunk to AI for evaluation with contextual titles and content previews...`);

    try {
      const evaluation = await generateObject({
        model: this.model,
        schema: z.object({
          nodeEvaluations: z.array(z.object({
            nodeId: z.string(),
            isRelevant: z.boolean(),
            relevanceScore: z.number().min(0).max(1),
            reasoning: z.string(),
            shouldExploreChildren: z.boolean()
          }))
        }),
        prompt: `You are a legal expert analyzing multiple nodes in a document tree to help with a consumer rights case.

Case Information:
${JSON.stringify(context.caseInformation, null, 2)}

Previous relevant nodes visited: ${previousRelevantNodes || "None"}

 Nodes to Evaluate:
${validNodes.map(({ nodeId, node }, index) => {
  // Use enhanced context extraction
  const enhancedContext = this.extractEnhancedNodeContext(node!);
  
  return `
${index + 1}. Node ID: ${nodeId}
   ${enhancedContext}
   Level: ${node!.level}
   Children: ${node!.children?.length || 0}
   Legal References: ${node!.metadata?.legal_references?.slice(0, 3).join(", ") || "None"}`;
}).join("\n")}

For each node, evaluate whether it is relevant to the case. Consider:
1. Does the content directly relate to the consumer's issue?
2. Could this section contain important legal provisions?
3. Is this a general section that might have relevant subsections?

For each node, provide:
- nodeId: The exact node ID provided
- isRelevant: Whether the node is relevant
- relevanceScore: A score from 0-1 indicating relevance
- reasoning: Detailed reasoning for your decision
- shouldExploreChildren: Whether to explore child nodes

IMPORTANT: You must provide an evaluation for each of the ${validNodes.length} nodes listed above, in the same order, using their exact nodeId values.`
      });

      const decisions: TraversalDecision[] = [];
      
      // Process the batch results
      for (const nodeId of nodeIds) {
        const mappingResult = this.findNodeEvaluationWithMapping(
          nodeId,
          evaluation.object.nodeEvaluations,
          nodeIds
        );
        
        if (mappingResult) {
          const { evaluation: nodeEvaluation, mappedFrom } = mappingResult;
          
          decisions.push({
            nodeId,
            visited: nodeEvaluation.shouldExploreChildren,
            reasoning: nodeEvaluation.reasoning,
            relevanceScore: nodeEvaluation.relevanceScore,
            timestamp: new Date(),
            depth: context.currentDepth
          });
          
          if (mappedFrom) {
            console.log(`✅ [Batch Chunk] AI evaluation complete for ${nodeId} (mapped from "${mappedFrom}"):`);
          } else {
            console.log(`✅ [Batch Chunk] AI evaluation complete for ${nodeId}:`);
          }
          console.log(`   - Relevant: ${nodeEvaluation.isRelevant}`);
          console.log(`   - Score: ${nodeEvaluation.relevanceScore.toFixed(2)}`);
          console.log(`   - Should explore children: ${nodeEvaluation.shouldExploreChildren}`);
          console.log(`   - Reasoning: ${nodeEvaluation.reasoning}`);
        } else {
          // Enhanced error logging for missing evaluations
          console.error(`❌ [Batch Chunk] NO MAPPING FOUND for nodeId: ${nodeId}`);
          console.error(`🔍 [Batch Chunk] EXPECTED: Evaluation for node "${nodeId}"`);
          console.error(`📥 [Batch Chunk] RECEIVED EVALUATIONS: ${evaluation.object.nodeEvaluations.length} total`);
          
          // Log all received nodeIds for comparison
          const receivedNodeIds = evaluation.object.nodeEvaluations.map((e: any) => e.nodeId);
          console.error(`📋 [Batch Chunk] RECEIVED NODE IDS:`, receivedNodeIds);
          console.error(`📋 [Batch Chunk] EXPECTED NODE IDS:`, nodeIds);
          
          // Log mapping attempts for this specific node
          console.error(`🔍 [Node Mapping] Attempted mapping for "${nodeId}":`);
          const expectedPatterns = this.extractNodeIdPatterns(nodeId);
          console.error(`   - Expected patterns:`, expectedPatterns);
          
          receivedNodeIds.forEach((receivedId: string) => {
            const isNumberMatch = this.matchesNumberPrefix(nodeId, receivedId);
            const isKeyPhraseMatch = this.matchesKeyPhrases(nodeId, receivedId, expectedPatterns);
            const isFuzzyMatch = this.matchesFuzzyString(nodeId, receivedId);
            
            console.error(`   - "${receivedId}": number=${isNumberMatch}, phrase=${isKeyPhraseMatch}, fuzzy=${isFuzzyMatch}`);
          });
          
          // Check for potential mismatches
          const missingNodeIds = nodeIds.filter(id => !receivedNodeIds.includes(id));
          const extraNodeIds = receivedNodeIds.filter(id => !nodeIds.includes(id));
          
          if (missingNodeIds.length > 0) {
            console.error(`❌ [Batch Chunk] MISSING FROM RESPONSE: ${missingNodeIds.join(', ')}`);
          }
          if (extraNodeIds.length > 0) {
            console.error(`⚠️ [Batch Chunk] UNEXPECTED IN RESPONSE: ${extraNodeIds.join(', ')}`);
          }
          
          // Check if this node exists in the document tree
          const node = this.documentTree.nodes[nodeId];
          if (!node) {
            console.error(`💀 [Batch Chunk] ROOT CAUSE: Node "${nodeId}" does not exist in document tree`);
          } else {
            console.error(`🔗 [Batch Chunk] NODE EXISTS: "${node.title}" (Level ${node.level})`);
            console.error(`📝 [Batch Chunk] NODE CONTEXT SENT: ${this.extractEnhancedNodeContext(node)}`);
          }
          
          console.warn(`⚠️ [Batch Chunk] Using fallback decision for unmappable evaluation: ${nodeId}`);
          decisions.push({
            nodeId,
            visited: false,
            reasoning: "Could not map to batch evaluation response",
            relevanceScore: 0,
            timestamp: new Date(),
            depth: context.currentDepth
          });
        }
      }

      return decisions;
    } catch (error) {
      // Enhanced error logging for batch evaluation failures
      console.error(`❌ [Batch Chunk] BATCH EVALUATION FAILURE`);
      console.error(`🔢 [Batch Chunk] CHUNK SIZE: ${nodeIds.length} nodes`);
      console.error(`📋 [Batch Chunk] NODE IDS IN CHUNK:`, nodeIds);
      console.error(`🚨 [Batch Chunk] ERROR TYPE: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`📝 [Batch Chunk] ERROR MESSAGE: ${error instanceof Error ? error.message : String(error)}`);
      
      if (error instanceof Error && error.stack) {
        console.error(`📚 [Batch Chunk] ERROR STACK:`, error.stack);
      }
      
      // Log the nodes that were being processed when the error occurred
      console.error(`🔍 [Batch Chunk] NODES BEING PROCESSED:`);
      nodeIds.forEach((nodeId, index) => {
        const node = this.documentTree.nodes[nodeId];
        if (node) {
          console.error(`   ${index + 1}. ${nodeId}: "${node.title}" (Level ${node.level})`);
        } else {
          console.error(`   ${index + 1}. ${nodeId}: NODE NOT FOUND IN TREE`);
        }
      });
      
      // Check if this might be a rate limiting or API issue
      const errorStr = String(error).toLowerCase();
      if (errorStr.includes('rate') || errorStr.includes('limit') || errorStr.includes('quota')) {
        console.error(`🚫 [Batch Chunk] LIKELY CAUSE: API rate limiting or quota exceeded`);
      } else if (errorStr.includes('timeout') || errorStr.includes('network')) {
        console.error(`🌐 [Batch Chunk] LIKELY CAUSE: Network timeout or connectivity issue`);
      } else if (errorStr.includes('token') || errorStr.includes('length')) {
        console.error(`📏 [Batch Chunk] LIKELY CAUSE: Token limit exceeded - chunk too large`);
      } else {
        console.error(`❓ [Batch Chunk] UNKNOWN ERROR TYPE - See details above`);
      }
      
      console.error(`⚠️ [Batch Chunk] Returning fallback decisions for all ${nodeIds.length} nodes in failed chunk`);
      
      // Return fallback decisions for all nodes
      return nodeIds.map(nodeId => ({
        nodeId,
        visited: false,
        reasoning: "Error during batch evaluation",
        relevanceScore: 0,
        timestamp: new Date(),
        depth: context.currentDepth
      }));
    }
  }

  // DEPRECATED: Keep the old method for fallback, but mark as deprecated
  private async evaluateNode(
    nodeId: string,
    context: TraversalContext
  ): Promise<TraversalDecision> {
    console.log(`🔎 [Node Evaluation] Evaluating node: ${nodeId}`);
    
    const node = this.documentTree.nodes[nodeId];
    if (!node) {
      console.error(`❌ [Node Evaluation] Node ${nodeId} not found in document tree`);
      return {
        nodeId,
        visited: false,
        reasoning: "Node not found in document tree",
        relevanceScore: 0,
        timestamp: new Date(),
        depth: context.currentDepth
      };
    }

    console.log(`📋 [Node Evaluation] Node details:`);
    console.log(`   - Title: "${node.title}"`);
    console.log(`   - Level: ${node.level}`);
    console.log(`   - Content length: ${node.content.length} characters`);
    console.log(`   - Content preview: "${node.content.substring(0, 200)}..."`);
    console.log(`   - Keywords: ${node.metadata?.keywords?.join(", ") || "None"}`);
    console.log(`   - Children: ${node.children?.length || 0}`);
    console.log(`   - Metadata: ${JSON.stringify(node.metadata, null, 2)}`);
    
    const previousRelevantNodes = context.decisions
      .filter(d => d.relevanceScore > 0.5)
      .map(d => this.documentTree.nodes[d.nodeId]?.title)
      .join(", ");
    
    console.log(`📚 [Node Evaluation] Previous relevant nodes: ${previousRelevantNodes || "None"}`);
    console.log(`🤖 [Node Evaluation] Sending to AI for evaluation...`);

    try {
      const evaluation = await generateObject({
        model: this.model,
        schema: z.object({
          isRelevant: z.boolean(),
          relevanceScore: z.number().min(0).max(1),
          reasoning: z.string(),
          shouldExploreChildren: z.boolean()
        }),
        prompt: `You are a legal expert analyzing a document tree to help with a consumer rights case.

Case Information:
${JSON.stringify(context.caseInformation, null, 2)}

Current Node:
Title: ${node.title}
Content: ${node.content}
Level: ${node.level}
Keywords: ${node.metadata?.keywords?.join(", ") || "None"}

Previous relevant nodes visited: ${context.decisions
  .filter(d => d.relevanceScore > this.relevanceThreshold)
  .map(d => this.documentTree.nodes[d.nodeId]?.title)
  .join(", ")}

Evaluate whether this node is relevant to the case. Consider:
1. Does the content directly relate to the consumer's issue?
2. Could this section contain important legal provisions?
3. Is this a general section that might have relevant subsections?

Provide a relevance score (0-1) and detailed reasoning for your decision.`
      });

      const decision = {
        nodeId,
        visited: evaluation.object.shouldExploreChildren,
        reasoning: evaluation.object.reasoning,
        relevanceScore: evaluation.object.relevanceScore,
        timestamp: new Date(),
        depth: context.currentDepth
      };

      console.log(`✅ [Node Evaluation] AI evaluation complete for ${nodeId}:`);
      console.log(`   - Relevant: ${evaluation.object.isRelevant}`);
      console.log(`   - Score: ${evaluation.object.relevanceScore.toFixed(2)}`);
      console.log(`   - Should explore children: ${evaluation.object.shouldExploreChildren}`);
      console.log(`   - Reasoning: ${evaluation.object.reasoning}`);

      return decision;
    } catch (error) {
      console.error(`❌ [Node Evaluation] Error evaluating node ${nodeId}:`, error);
      return {
        nodeId,
        visited: false,
        reasoning: "Error during evaluation",
        relevanceScore: 0,
        timestamp: new Date(),
        depth: context.currentDepth
      };
    }
  }

  private async generateFinalRecommendation(
    relevantNodes: LegalNode[],
    context: TraversalContext
  ): Promise<string> {
    const result = await generateObject({
      model: this.model,
      schema: z.object({
        recommendation: z.string(),
        confidence: z.number().min(0).max(1),
        keyFindings: z.array(z.string()),
        additionalInfoNeeded: z.array(z.string()).optional()
      }),
      prompt: `Based on the traversal of legal documentation for this consumer rights case, provide a final recommendation.

Case Information:
${JSON.stringify(context.caseInformation, null, 2)}

Relevant Legal Sections Found:
${relevantNodes.map(node => `
- ${node.title}
  Content: ${node.content}
  Relevance: ${context.decisions.find(d => d.nodeId === node.id)?.reasoning || "N/A"}
`).join("\n")}

Provide:
1. A clear recommendation for the consumer
2. Confidence level (0-1)
3. Key findings from the legal documentation
4. Any additional information needed (if applicable)`
    });

    return result.object.recommendation;
  }

  // Method to get a visual representation of the traversal
  getTraversalVisualization(decisions: TraversalDecision[]): string {
    const visited = decisions.filter(d => d.visited);
    const skipped = decisions.filter(d => !d.visited);

    let visualization = "=== TRAVERSAL PATH ===\n\n";
    
    // Group by depth
    const byDepth = visited.reduce((acc, decision) => {
      if (!acc[decision.depth]) acc[decision.depth] = [];
      acc[decision.depth].push(decision);
      return acc;
    }, {} as Record<number, TraversalDecision[]>);

    Object.entries(byDepth).forEach(([depth, decisions]) => {
      visualization += `Level ${depth}:\n`;
      decisions.forEach(d => {
        const node = this.documentTree.nodes[d.nodeId];
        visualization += `  → ${node?.title || d.nodeId} (Score: ${d.relevanceScore.toFixed(2)})\n`;
        visualization += `    Reasoning: ${d.reasoning}\n\n`;
      });
    });

    if (skipped.length > 0) {
      visualization += "\n=== SKIPPED NODES ===\n";
      skipped.forEach(d => {
        const node = this.documentTree.nodes[d.nodeId];
        visualization += `  ✗ ${node?.title || d.nodeId}\n`;
        visualization += `    Reason: ${d.reasoning}\n`;
      });
    }

    return visualization;
  }

  // Helper method to intelligently map received nodeIds to expected nodeIds
  private findNodeEvaluationWithMapping(
    expectedNodeId: string,
    evaluations: any[],
    allExpectedNodeIds: string[]
  ): any | null {
    // First try exact match
    let evaluation = evaluations.find((e: any) => e.nodeId === expectedNodeId);
    if (evaluation) {
      return { evaluation, mappedFrom: null };
    }

    // Extract patterns for intelligent matching
    const expectedPatterns = this.extractNodeIdPatterns(expectedNodeId);
    
    // Try to find a match using various fuzzy matching strategies
    for (const receivedEval of evaluations) {
      const receivedNodeId = receivedEval.nodeId;
      
      // Skip if this received ID was already matched to another expected ID
      if (receivedEval._alreadyMatched) continue;
      
      // Strategy 1: Number prefix matching (e.g., "28" matches "28 Other rules...")
      if (this.matchesNumberPrefix(expectedNodeId, receivedNodeId)) {
        console.log(`🔗 [Node Mapping] Number prefix match: "${receivedNodeId}" → "${expectedNodeId}"`);
        receivedEval._alreadyMatched = true;
        return { evaluation: receivedEval, mappedFrom: receivedNodeId };
      }
      
      // Strategy 2: Key phrase matching from titles
      if (this.matchesKeyPhrases(expectedNodeId, receivedNodeId, expectedPatterns)) {
        console.log(`🔗 [Node Mapping] Key phrase match: "${receivedNodeId}" → "${expectedNodeId}"`);
        receivedEval._alreadyMatched = true;
        return { evaluation: receivedEval, mappedFrom: receivedNodeId };
      }
      
      // Strategy 3: Fuzzy string similarity
      if (this.matchesFuzzyString(expectedNodeId, receivedNodeId)) {
        console.log(`🔗 [Node Mapping] Fuzzy string match: "${receivedNodeId}" → "${expectedNodeId}"`);
        receivedEval._alreadyMatched = true;
        return { evaluation: receivedEval, mappedFrom: receivedNodeId };
      }
    }
    
    return null;
  }

  private extractNodeIdPatterns(nodeId: string): {
    number?: string;
    keyWords: string[];
    cleanTitle: string;
  } {
    // Extract leading number if present
    const numberMatch = nodeId.match(/^(\d+)/);
    const number = numberMatch ? numberMatch[1] : undefined;
    
    // Extract meaningful words (excluding common words)
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'with', 'by', 'from', 'as', 'at', 'on', 'is', 'are', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must']);
    
    const words = nodeId.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word));
    
    return {
      number,
      keyWords: words,
      cleanTitle: nodeId.replace(/^\d+\s*/, '').trim()
    };
  }

  private matchesNumberPrefix(expectedNodeId: string, receivedNodeId: string): boolean {
    // Extract numbers from both
    const expectedNumber = expectedNodeId.match(/^(\d+)/)?.[1];
    const receivedNumber = receivedNodeId.match(/^(\d+)/)?.[1];
    
    // If both have numbers and they match
    if (expectedNumber && receivedNumber && expectedNumber === receivedNumber) {
      return true;
    }
    
    // If received is just a number and expected starts with that number
    if (/^\d+$/.test(receivedNodeId.trim()) && expectedNodeId.startsWith(receivedNodeId.trim() + ' ')) {
      return true;
    }
    
    return false;
  }

  private matchesKeyPhrases(expectedNodeId: string, receivedNodeId: string, expectedPatterns: any): boolean {
    const receivedPatterns = this.extractNodeIdPatterns(receivedNodeId);
    
    // Check if significant key words overlap
    const commonKeyWords = expectedPatterns.keyWords.filter((word: string) => 
      receivedPatterns.keyWords.some((rWord: string) => 
        rWord.includes(word) || word.includes(rWord) || this.levenshteinDistance(word, rWord) <= 1
      )
    );
    
    // If we have good keyword overlap (at least 50% of expected keywords or minimum 2)
    const overlapRatio = commonKeyWords.length / Math.max(expectedPatterns.keyWords.length, 1);
    return overlapRatio >= 0.5 || commonKeyWords.length >= 2;
  }

  private matchesFuzzyString(expectedNodeId: string, receivedNodeId: string): boolean {
    // Simple fuzzy matching using normalized strings
    const normalize = (str: string) => str.toLowerCase().replace(/[^\w]/g, '');
    const normalizedExpected = normalize(expectedNodeId);
    const normalizedReceived = normalize(receivedNodeId);
    
    // Check if one is contained in the other with reasonable length
    if (normalizedReceived.length >= 5 && normalizedExpected.includes(normalizedReceived)) {
      return true;
    }
    
    if (normalizedExpected.length >= 5 && normalizedReceived.includes(normalizedExpected)) {
      return true;
    }
    
    // Levenshtein distance for shorter strings
    if (normalizedExpected.length <= 20 && normalizedReceived.length <= 20) {
      const distance = this.levenshteinDistance(normalizedExpected, normalizedReceived);
      const maxLength = Math.max(normalizedExpected.length, normalizedReceived.length);
      const similarity = 1 - (distance / maxLength);
      return similarity >= 0.7; // 70% similarity threshold
    }
    
    return false;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
} 