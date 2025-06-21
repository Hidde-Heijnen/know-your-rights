import type { LegalDocumentTree, LegalNode } from "../types/traversal";

/**
 * Transforms raw JSON data into a structured LegalDocumentTree
 * This function handles various possible formats of the input data
 */
export function transformRawDocument(rawData: any): LegalDocumentTree {
  console.log("🔍 [Document Transformer] Starting transformation...");
  console.log("📊 [Document Transformer] Raw data type:", typeof rawData);
  console.log("📊 [Document Transformer] Raw data keys:", Object.keys(rawData || {}));
  
  // If the data already has the expected structure
  if (rawData.nodes && rawData.rootNodes) {
    console.log("✅ [Document Transformer] Data already has expected structure");
    console.log("📊 [Document Transformer] Found", Object.keys(rawData.nodes).length, "existing nodes");
    console.log("📊 [Document Transformer] Found", rawData.rootNodes.length, "root nodes");
    return rawData as LegalDocumentTree;
  }

  const nodes: Record<string, LegalNode> = {};
  const rootNodes: string[] = [];
  const idCounters: Record<string, number> = {}; // Track duplicate IDs

  // Helper function to generate unique ID
  const generateUniqueId = (baseId: string): string => {
    if (!nodes[baseId]) {
      return baseId;
    }
    
    if (!idCounters[baseId]) {
      idCounters[baseId] = 1;
    }
    
    let uniqueId: string;
    do {
      idCounters[baseId]++;
      uniqueId = `${baseId}_${idCounters[baseId]}`;
    } while (nodes[uniqueId]);
    
    console.log(`⚠️ [Document Transformer] Duplicate ID detected: ${baseId} -> ${uniqueId}`);
    return uniqueId;
  };

  // Helper function to recursively process processed JSON structure
  const processProcessedNode = (nodeData: any, parentId?: string): string => {
    const nodeId = nodeData.id || `node_${Object.keys(nodes).length}`;
    console.log(`📝 [Document Transformer] Processing processed node: ${nodeId}`);
    
    // Extract content from either text_content or summary
    const content = nodeData.text_content || nodeData.summary || "";
    
    // Create the node
    const node: LegalNode = {
      id: nodeId,
      title: nodeData.title || nodeId,
      content: content,
      level: nodeData.level || 0,
      children: [],
      metadata: {
        keywords: nodeData.key_terms || nodeData.metadata?.keywords || [],
        relevance_tags: nodeData.metadata?.main_themes || [],
        legal_references: nodeData.links?.map((link: any) => link.target_section).filter(Boolean) || [],
        section_type: nodeData.metadata?.summary_type,
        section_number: nodeData.metadata?.section_number,
        ...nodeData.metadata
      }
    };
    
    console.log(`✅ [Document Transformer] Created processed node: ${nodeId} - "${node.title}"`);
    console.log(`📊 [Document Transformer] Content length: ${content.length} chars`);
    console.log(`📊 [Document Transformer] Level: ${node.level}`);
    
    nodes[nodeId] = node;
    
    // Process children if they exist (children is an object in processed format)
    if (nodeData.children && typeof nodeData.children === 'object') {
      const childKeys = Object.keys(nodeData.children);
      console.log(`👥 [Document Transformer] Processing ${childKeys.length} children for node ${nodeId}`);
      
      childKeys.forEach(childKey => {
        const childData = nodeData.children[childKey];
        console.log(`📝 [Document Transformer] Processing child: ${childKey}`);
        
        const childId = processProcessedNode(childData, nodeId);
        node.children!.push(childId);
      });
    }
    
    return nodeId;
  };

  console.log("🏗️ [Document Transformer] Building new structure...");

  // Check if this is the new processed format (has id, title, level, children as object)
  if (rawData.id && rawData.title !== undefined && rawData.level !== undefined && 
      (rawData.children === undefined || typeof rawData.children === 'object')) {
    console.log("🆕 [Document Transformer] Processing new processed JSON format");
    console.log("📊 [Document Transformer] Root node:", rawData.id);
    
    const rootId = processProcessedNode(rawData);
    rootNodes.push(rootId);
  }
  // Handle nested structure (chapters -> sections -> subsections)
  else if (rawData.chapters || rawData.sections) {
    console.log("📖 [Document Transformer] Processing chapters/sections structure");
    const chapters = rawData.chapters || rawData.sections || rawData;
    console.log("📊 [Document Transformer] Found", Object.keys(chapters).length, "chapters/sections");
    
    Object.entries(chapters).forEach(([chapterId, chapterData]: [string, any]) => {
      console.log(`📝 [Document Transformer] Processing chapter: ${chapterId}`);
      console.log(`📝 [Document Transformer] Chapter data keys:`, Object.keys(chapterData || {}));
      
      // Create chapter node
      const chapterNode: LegalNode = {
        id: chapterId,
        title: chapterData.title || chapterId,
        content: chapterData.content || chapterData.description || "",
        level: 0,
        children: [],
        metadata: {
          keywords: chapterData.keywords || [],
          relevance_tags: chapterData.tags || [],
          legal_references: chapterData.references || []
        }
      };
      
      console.log(`✅ [Document Transformer] Created chapter node: ${chapterId} - "${chapterNode.title}"`);
      nodes[chapterId] = chapterNode;
      rootNodes.push(chapterId);

      // Process sections within chapters
      if (chapterData.sections) {
        console.log(`📑 [Document Transformer] Processing ${Object.keys(chapterData.sections).length} sections in chapter ${chapterId}`);
        Object.entries(chapterData.sections).forEach(([sectionId, sectionData]: [string, any]) => {
          const fullSectionId = `${chapterId}_${sectionId}`;
          console.log(`📝 [Document Transformer] Processing section: ${fullSectionId}`);
          
          const sectionNode: LegalNode = {
            id: fullSectionId,
            title: sectionData.title || sectionId,
            content: sectionData.content || sectionData.description || "",
            level: 1,
            children: [],
            metadata: {
              keywords: sectionData.keywords || [],
              relevance_tags: sectionData.tags || [],
              legal_references: sectionData.references || []
            }
          };
          
          console.log(`✅ [Document Transformer] Created section node: ${fullSectionId} - "${sectionNode.title}"`);
          nodes[fullSectionId] = sectionNode;
          chapterNode.children!.push(fullSectionId);

          // Process subsections
          if (sectionData.subsections) {
            console.log(`📄 [Document Transformer] Processing ${Object.keys(sectionData.subsections).length} subsections in section ${fullSectionId}`);
            Object.entries(sectionData.subsections).forEach(([subsectionId, subsectionData]: [string, any]) => {
              const fullSubsectionId = `${fullSectionId}_${subsectionId}`;
              console.log(`📝 [Document Transformer] Processing subsection: ${fullSubsectionId}`);
              
              const subsectionNode: LegalNode = {
                id: fullSubsectionId,
                title: subsectionData.title || subsectionId,
                content: subsectionData.content || subsectionData.description || "",
                level: 2,
                children: [],
                metadata: {
                  keywords: subsectionData.keywords || [],
                  relevance_tags: subsectionData.tags || [],
                  legal_references: subsectionData.references || []
                }
              };
              
              console.log(`✅ [Document Transformer] Created subsection node: ${fullSubsectionId} - "${subsectionNode.title}"`);
              nodes[fullSubsectionId] = subsectionNode;
              sectionNode.children!.push(fullSubsectionId);
            });
          }
        });
      }
    });
  } 
  // Handle agent_results structure specifically
  else if (rawData.agent_results) {
    console.log("🤖 [Document Transformer] Processing agent_results structure");
    console.log("📊 [Document Transformer] Agent results keys:", Object.keys(rawData.agent_results));
    
    // Check for structure_discovery agent
    if (rawData.agent_results.structure_discovery?.structure_analysis?.document_structure) {
      console.log("🏗️ [Document Transformer] Found structure_discovery data");
      const docStructure = rawData.agent_results.structure_discovery.structure_analysis.document_structure;
      console.log("📊 [Document Transformer] Document structure type:", docStructure.type);
      
      if (docStructure.root_sections) {
        console.log("📊 [Document Transformer] Processing", docStructure.root_sections.length, "root sections");
        
        docStructure.root_sections.forEach((section: any, index: number) => {
          console.log(`📝 [Document Transformer] Processing root section ${index}: ${section.id || `section_${index}`}`);
          console.log(`📝 [Document Transformer] Section data:`, {
            id: section.id,
            title: section.title,
            type: section.type,
            level: section.level,
            hasContent: !!section.text_content,
            contentLength: section.text_content?.length || 0
          });
          
          const baseNodeId = section.id || `section_${index}`;
          const nodeId = generateUniqueId(baseNodeId);
          const node: LegalNode = {
            id: nodeId,
            title: section.title || section.number || nodeId,
            content: section.text_content || "",
            level: section.level || 0,
            children: [],
            metadata: {
              keywords: section.keywords || [],
              relevance_tags: section.tags || [],
              legal_references: section.references || [],
              section_type: section.type,
              section_number: section.number
            }
          };
          
          console.log(`✅ [Document Transformer] Created root section node: ${nodeId} - "${node.title}"`);
          console.log(`📊 [Document Transformer] Content preview: ${node.content.substring(0, 100)}...`);
          nodes[nodeId] = node;
          rootNodes.push(nodeId);
          
          // Process children if they exist
          if (section.children && Array.isArray(section.children)) {
            console.log(`👥 [Document Transformer] Processing ${section.children.length} children for section ${nodeId}`);
            section.children.forEach((child: any, childIndex: number) => {
              const baseChildId = child.id || `${nodeId}_child_${childIndex}`;
              const childId = generateUniqueId(baseChildId);
              console.log(`📝 [Document Transformer] Processing child: ${childId}`);
              
              const childNode: LegalNode = {
                id: childId,
                title: child.title || child.number || childId,
                content: child.text_content || "",
                level: (section.level || 0) + 1,
                children: [],
                metadata: {
                  keywords: child.keywords || [],
                  relevance_tags: child.tags || [],
                  legal_references: child.references || [],
                  section_type: child.type,
                  section_number: child.number
                }
              };
              
              console.log(`✅ [Document Transformer] Created child node: ${childId} - "${childNode.title}"`);
              nodes[childId] = childNode;
              node.children!.push(childId);
            });
          }
        });
      }
    }
    
    // Also check other agents for additional content
    Object.entries(rawData.agent_results).forEach(([agentName, agentData]: [string, any]) => {
      if (agentName !== 'structure_discovery' && agentData?.status === 'success') {
        console.log(`🤖 [Document Transformer] Processing additional agent: ${agentName}`);
        // Add agent-specific processing if needed
      }
    });
  }
  // Handle flat array structure
  else if (Array.isArray(rawData)) {
    console.log("📋 [Document Transformer] Processing flat array structure");
    console.log("📊 [Document Transformer] Array length:", rawData.length);
    
    rawData.forEach((item, index) => {
      const nodeId = item.id || `node_${index}`;
      console.log(`📝 [Document Transformer] Processing array item ${index}: ${nodeId}`);
      
      const node: LegalNode = {
        id: nodeId,
        title: item.title || item.name || `Node ${index}`,
        content: item.content || item.description || item.text || "",
        level: item.level || 0,
        children: item.children || [],
        metadata: {
          keywords: item.keywords || [],
          relevance_tags: item.tags || [],
          legal_references: item.references || []
        }
      };
      
      console.log(`✅ [Document Transformer] Created array node: ${nodeId} - "${node.title}"`);
      nodes[nodeId] = node;
      
      // Add to root nodes if it has no parent
      if (item.level === 0 || !item.parent) {
        console.log(`🌳 [Document Transformer] Adding ${nodeId} as root node`);
        rootNodes.push(nodeId);
      }
    });
  }
  // Handle object structure with IDs as keys
  else if (typeof rawData === 'object') {
    console.log("📦 [Document Transformer] Processing object structure with ID keys");
    console.log("📊 [Document Transformer] Object keys:", Object.keys(rawData));
    
    Object.entries(rawData).forEach(([nodeId, nodeData]: [string, any]) => {
      // Skip metadata fields
      if (nodeId === 'processing_metadata' || nodeId === 'agent_results') {
        console.log(`⏭️ [Document Transformer] Skipping metadata field: ${nodeId}`);
        return;
      }
      
      console.log(`📝 [Document Transformer] Processing object key: ${nodeId}`);
      console.log(`📝 [Document Transformer] Node data type:`, typeof nodeData);
      console.log(`📝 [Document Transformer] Node data keys:`, Object.keys(nodeData || {}));
      
      const node: LegalNode = {
        id: nodeId,
        title: nodeData.title || nodeData.name || nodeId,
        content: nodeData.content || nodeData.description || nodeData.text || "",
        level: nodeData.level || 0,
        children: nodeData.children || [],
        metadata: {
          keywords: nodeData.keywords || [],
          relevance_tags: nodeData.tags || [],
          legal_references: nodeData.references || []
        }
      };
      
      console.log(`✅ [Document Transformer] Created object node: ${nodeId} - "${node.title}"`);
      nodes[nodeId] = node;
      
      // Add to root nodes if it has no parent
      if (nodeData.level === 0 || !nodeData.parent) {
        console.log(`🌳 [Document Transformer] Adding ${nodeId} as root node`);
        rootNodes.push(nodeId);
      }
    });
  }

  console.log("🏁 [Document Transformer] Transformation complete!");
  console.log("📊 [Document Transformer] Final statistics:");
  console.log(`   - Total nodes created: ${Object.keys(nodes).length}`);
  console.log(`   - Root nodes: ${rootNodes.length}`);
  console.log(`   - Root node IDs: ${rootNodes.join(', ')}`);
  
  // Log details about each node
  Object.entries(nodes).forEach(([nodeId, node]) => {
    console.log(`📋 [Document Transformer] Node ${nodeId}:`);
    console.log(`   - Title: "${node.title}"`);
    console.log(`   - Level: ${node.level}`);
    console.log(`   - Children: ${node.children?.length || 0}`);
    console.log(`   - Content length: ${node.content.length} chars`);
    console.log(`   - Content preview: "${node.content.substring(0, 150)}..."`);
  });

  return {
    nodes,
    rootNodes
  };
}

/**
 * Validates that a document tree has the required structure
 */
export function validateDocumentTree(tree: LegalDocumentTree): boolean {
  console.log("🔍 [Document Validator] Starting validation...");
  
  if (!tree.nodes || !tree.rootNodes) {
    console.error("❌ [Document Validator] Missing nodes or rootNodes");
    return false;
  }

  if (tree.rootNodes.length === 0) {
    console.error("❌ [Document Validator] No root nodes found");
    return false;
  }

  console.log("📊 [Document Validator] Validating", tree.rootNodes.length, "root nodes");

  // Check that all root nodes exist
  for (const rootId of tree.rootNodes) {
    if (!tree.nodes[rootId]) {
      console.error(`❌ [Document Validator] Root node ${rootId} not found in nodes`);
      return false;
    }
    console.log(`✅ [Document Validator] Root node ${rootId} exists`);
  }

  console.log("📊 [Document Validator] Validating child references for", Object.keys(tree.nodes).length, "nodes");

  // Check that all child references are valid
  for (const [nodeId, node] of Object.entries(tree.nodes)) {
    if (node.children) {
      console.log(`👥 [Document Validator] Checking ${node.children.length} children for node ${nodeId}`);
      for (const childId of node.children) {
        if (!tree.nodes[childId]) {
          console.error(`❌ [Document Validator] Child node ${childId} not found for parent ${nodeId}`);
          return false;
        }
      }
    }
  }

  console.log("✅ [Document Validator] Validation successful!");
  return true;
} 