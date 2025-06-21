// Type definitions for the legal documentation traversal system

export interface LegalNode {
  id: string;
  title: string;
  content: string;
  level: number;
  children?: string[]; // IDs of child nodes
  metadata?: {
    keywords?: string[];
    relevance_tags?: string[];
    legal_references?: string[];
    section_type?: string;
    section_number?: string;
    main_themes?: string[];
    scope?: string;
    relationship_to_subsections?: string;
    children_count?: number;
    summary_type?: string;
    key_points?: string[];
    legal_requirements?: string[];
    practical_impact?: string;
    content_length?: number;
    term_usage?: Array<{
      term: string;
      usage_context: string;
      likely_defined_elsewhere: boolean;
    }>;
    [key: string]: any; // Allow additional metadata fields
  };
}

export interface LegalDocumentTree {
  nodes: Record<string, LegalNode>;
  rootNodes: string[];
}

export interface TraversalDecision {
  nodeId: string;
  visited: boolean;
  reasoning: string;
  relevanceScore: number;
  timestamp: Date;
  depth: number;
}

export interface TraversalContext {
  caseInformation: any; // From stages 1 & 2
  visitedNodes: Set<string>;
  decisions: TraversalDecision[];
  currentDepth: number;
  maxDepth?: number;
}

export interface TraversalResult {
  relevantNodes: LegalNode[];
  traversalPath: TraversalDecision[];
  finalRecommendation?: string;
  requiresAdditionalInfo?: string[];
  documentNodes?: Record<string, LegalNode>; // For tree visualization
  visualization?: string; // Debug visualization
}

export interface TraversalStep {
  nodeId: string;
  nodeTitle: string;
  reasoning: string;
  childrenToExplore: string[];
  relevanceScore: number;
}

// New interfaces for claim evaluation
export interface ClaimEvaluationRequest {
  caseInformation?: any;
  exportData?: any;
}

export interface ClaimEvaluationResponse {
  success: boolean;
  evaluation: string;
  metadata: {
    model: string;
    relevantNodesAnalyzed: number;
    caseType: string;
    evaluationDate: string;
    totalCharacters: number;
  };
  error?: string;
  details?: string;
}

export interface ClaimEvaluationMetadata {
  model: string;
  relevantNodesAnalyzed: number;
  caseType: string;
  evaluationDate: string;
  totalCharacters: number;
} 