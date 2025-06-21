#!/usr/bin/env python3
"""
Script to explore the structure of consumer_rights_structure.json
and output the tree hierarchy to a text file.
"""

import json
import sys
from pathlib import Path


def explore_node(node, level=0, prefix="", is_last=True, output_lines=None):
    """
    Recursively explore a node in the tree structure.
    
    Args:
        node: The current node (dict) to explore
        level: Current depth level
        prefix: String prefix for indentation
        is_last: Whether this is the last child at this level
        output_lines: List to collect output lines
    """
    if output_lines is None:
        output_lines = []
    
    # Check if node is actually a dictionary
    if not isinstance(node, dict):
        output_lines.append(f"{prefix}{'└── ' if is_last else '├── '}Non-dict node: {type(node).__name__} = {str(node)[:100]}")
        return output_lines
    
    # Create the tree connector
    connector = "└── " if is_last else "├── "
    
    # Get node information
    node_id = node.get('id', 'NO_ID')
    node_type = node.get('type', 'NO_TYPE')
    node_title = node.get('title', 'NO_TITLE')
    node_level = node.get('level', 'NO_LEVEL')
    
    # Format the node information
    node_info = f"{node_id} ({node_type}) - Level {node_level}: {node_title}"
    
    # Add to output
    output_lines.append(f"{prefix}{connector}{node_info}")
    
    # Prepare prefix for children
    child_prefix = prefix + ("    " if is_last else "│   ")
    
    # Process children if they exist
    children = node.get('children', [])
    if children and isinstance(children, list):
        for i, child in enumerate(children):
            is_last_child = (i == len(children) - 1)
            explore_node(child, level + 1, child_prefix, is_last_child, output_lines)
    
    return output_lines


def explore_structure_recursive(structure, output_lines=None, level=0, prefix=""):
    """
    Recursively explore any structure (dict, list, or other).
    """
    if output_lines is None:
        output_lines = []
    
    if isinstance(structure, dict):
        # Check if this looks like a node with standard fields
        if 'id' in structure and 'type' in structure:
            return explore_node(structure, level, prefix, True, output_lines)
        else:
            # Explore dictionary keys
            for i, (key, value) in enumerate(structure.items()):
                is_last = (i == len(structure) - 1)
                connector = "└── " if is_last else "├── "
                output_lines.append(f"{prefix}{connector}{key}")
                
                child_prefix = prefix + ("    " if is_last else "│   ")
                if isinstance(value, (dict, list)):
                    explore_structure_recursive(value, output_lines, level + 1, child_prefix)
                else:
                    # For simple values, just show the type and a preview
                    value_preview = str(value)[:100] + "..." if len(str(value)) > 100 else str(value)
                    output_lines.append(f"{child_prefix}└── {type(value).__name__}: {value_preview}")
    
    elif isinstance(structure, list):
        for i, item in enumerate(structure):
            is_last = (i == len(structure) - 1)
            connector = "└── " if is_last else "├── "
            
            if isinstance(item, dict) and 'id' in item:
                # This looks like a node
                node_id = item.get('id', 'NO_ID')
                output_lines.append(f"{prefix}{connector}Item {i}: {node_id}")
                child_prefix = prefix + ("    " if is_last else "│   ")
                try:
                    explore_node(item, level + 1, child_prefix, True, output_lines)
                except Exception as e:
                    output_lines.append(f"{child_prefix}└── Error exploring node: {e}")
            else:
                output_lines.append(f"{prefix}{connector}Item {i} ({type(item).__name__})")
                child_prefix = prefix + ("    " if is_last else "│   ")
                if isinstance(item, (dict, list)):
                    explore_structure_recursive(item, output_lines, level + 1, child_prefix)
    
    return output_lines


def main():
    """Main function to process the JSON file and output the tree structure."""
    
    # File paths
    json_file_path = Path("data/consumer_rights_structure.json")
    output_file_path = Path("consumer_rights_tree_structure.txt")
    
    # Check if input file exists
    if not json_file_path.exists():
        print(f"Error: {json_file_path} not found!")
        sys.exit(1)
    
    try:
        # Load the JSON data
        print(f"Loading {json_file_path}...")
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"JSON loaded successfully. File size: {json_file_path.stat().st_size / 1024 / 1024:.2f} MB")
        
        # Prepare output lines
        output_lines = []
        output_lines.append("=== Consumer Rights Structure JSON Tree Hierarchy ===")
        output_lines.append("")
        output_lines.append(f"Generated from: {json_file_path}")
        output_lines.append(f"Total top-level keys: {len(data.keys())}")
        output_lines.append("")
        
        # Explore the top-level structure first
        output_lines.append("=== TOP-LEVEL STRUCTURE ===")
        explore_structure_recursive(data, output_lines)
        
        # Focus on the hierarchical document structure if it exists
        if 'hierarchical_document_structure' in data:
            output_lines.append("")
            output_lines.append("=== DETAILED HIERARCHICAL DOCUMENT STRUCTURE ===")
            
            hier_structure = data['hierarchical_document_structure']
            
            # Look for the actual document structure
            if 'document_structure' in hier_structure:
                doc_structure = hier_structure['document_structure']
                
                if isinstance(doc_structure, dict):
                    # Check for root sections or similar
                    for key, value in doc_structure.items():
                        output_lines.append(f"\n--- {key.upper()} ---")
                        if isinstance(value, list):
                            for i, item in enumerate(value):
                                if isinstance(item, dict) and 'id' in item:
                                    explore_node(item, 0, "", i == len(value) - 1, output_lines)
                                else:
                                    output_lines.append(f"Item {i}: {type(item).__name__}")
                        else:
                            explore_structure_recursive(value, output_lines)
                else:
                    explore_structure_recursive(doc_structure, output_lines)
        
        # Count statistics
        output_lines.append("")
        output_lines.append("=== STATISTICS ===")
        
        # Count nodes by level
        level_counts = {}
        
        def count_levels(structure):
            if isinstance(structure, dict):
                if 'level' in structure:
                    level = structure['level']
                    level_counts[level] = level_counts.get(level, 0) + 1
                
                for value in structure.values():
                    if isinstance(value, (dict, list)):
                        count_levels(value)
            elif isinstance(structure, list):
                for item in structure:
                    if isinstance(item, (dict, list)):
                        count_levels(item)
        
        count_levels(data)
        
        if level_counts:
            output_lines.append("Node counts by level:")
            for level in sorted(level_counts.keys()):
                output_lines.append(f"  Level {level}: {level_counts[level]} nodes")
            output_lines.append(f"Total levels: {len(level_counts)} (levels {min(level_counts.keys())} to {max(level_counts.keys())})")
        
        # Write to output file
        print(f"Writing tree structure to {output_file_path}...")
        with open(output_file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(output_lines))
        
        print(f"✅ Tree structure successfully written to {output_file_path}")
        print(f"📄 Output contains {len(output_lines)} lines")
        
        if level_counts:
            print(f"📊 Found {sum(level_counts.values())} total nodes across {len(level_counts)} levels")
        
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {json_file_path}: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main() 