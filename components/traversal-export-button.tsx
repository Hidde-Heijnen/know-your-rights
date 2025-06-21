"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Settings, FileJson, FileText, Table, Gavel, Scale } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

interface TraversalExportButtonProps {
  exportAvailable: boolean;
  disabled?: boolean;
}

export function TraversalExportButton({ 
  exportAvailable, 
  disabled = false 
}: TraversalExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [customOptions, setCustomOptions] = useState({
    format: 'json' as 'json' | 'csv' | 'summary',
    includeFullContent: true,
    includeMetadata: true
  });

  const handleQuickExport = async () => {
    if (!exportAvailable) {
      toast.error("Please run a traversal first before exporting.");
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔄 [Export] Starting quick export...");
      
      const response = await fetch("/api/traverse/export", {
        method: "GET"
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || "legal-traversal-export.json";
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log(`✅ [Export] Quick export completed: ${filename}`);
      toast.success(`Downloaded ${filename} successfully.`);

    } catch (error) {
      console.error("❌ [Export] Quick export error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomExport = async () => {
    if (!exportAvailable) {
      toast.error("Please run a traversal first before exporting.");
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔄 [Export] Starting custom export with options:", customOptions);
      
      const response = await fetch("/api/traverse/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(customOptions)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Custom export failed");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `legal-traversal-export.${customOptions.format}`;
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log(`✅ [Export] Custom export completed: ${filename}`);
      toast.success(`Downloaded ${filename} successfully.`);

      setShowCustomDialog(false);

    } catch (error) {
      console.error("❌ [Export] Custom export error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimEvaluation = async () => {
    if (!exportAvailable) {
      toast.error("Please run a traversal first before evaluating the claim.");
      return;
    }

    setIsEvaluating(true);
    try {
      console.log("🔄 [Claim Evaluation] Starting claim evaluation...");
      
      toast.info("Evaluating consumer claim with Gemini 2.5 Flash...");
      
      const response = await fetch("/api/traverse/evaluate-claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Claim evaluation failed");
      }

      const evaluationData = await response.json();
      
      console.log("✅ [Claim Evaluation] Evaluation completed, generating PDF...");
      
      // Generate PDF from the evaluation
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      
      // Title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CONSUMER CLAIM VALIDITY ANALYSIS', margin, 30);
      
      // Add metadata
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      let yPosition = 50;
      
      pdf.text(`Generated on: ${new Date(evaluationData.metadata.evaluationDate).toLocaleString('en-GB')}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`AI Model: ${evaluationData.metadata.model}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Legal Nodes Analysed: ${evaluationData.metadata.relevantNodesAnalyzed}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Case Type: ${evaluationData.metadata.caseType}`, margin, yPosition);
      yPosition += 20;
      
      // Add evaluation content
      pdf.setFontSize(12);
      const lines = pdf.splitTextToSize(evaluationData.evaluation, maxWidth);
      
      for (let i = 0; i < lines.length; i++) {
        if (yPosition > 270) { // Near bottom of page
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(lines[i], margin, yPosition);
        yPosition += 7;
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `consumer-claim-evaluation-${timestamp}.pdf`;
      
      // Download PDF
      pdf.save(filename);
      
      console.log(`✅ [Claim Evaluation] PDF generated: ${filename}`);
      toast.success(`Claim evaluation completed! Downloaded ${filename}`);

    } catch (error) {
      console.error("❌ [Claim Evaluation] Evaluation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to evaluate consumer claim");
    } finally {
      setIsEvaluating(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv': return <Table className="h-4 w-4" />;
      case 'summary': return <FileText className="h-4 w-4" />;
      default: return <FileJson className="h-4 w-4" />;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'csv': return "Spreadsheet format with basic decision data";
      case 'summary': return "Condensed report with key findings only";
      case 'json': return "Complete data with all details and metadata";
      default: return "";
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            disabled={disabled || isLoading || isEvaluating}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export & Analyse
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Export Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleQuickExport}
            disabled={!exportAvailable || isLoading || isEvaluating}
            className="flex items-center gap-2"
          >
            <FileJson className="h-4 w-4" />
            <div className="flex flex-col">
              <span>Quick Export (JSON)</span>
              <span className="text-xs text-muted-foreground">Complete data export</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowCustomDialog(true)}
            disabled={!exportAvailable || isLoading || isEvaluating}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            <div className="flex flex-col">
              <span>Custom Export</span>
              <span className="text-xs text-muted-foreground">Choose format & options</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Legal Analysis
          </DropdownMenuLabel>
          
          <DropdownMenuItem 
            onClick={handleClaimEvaluation}
            disabled={!exportAvailable || isLoading || isEvaluating}
            className="flex items-center gap-2"
          >
            <Gavel className="h-4 w-4" />
            <div className="flex flex-col">
              <span>Evaluate Claim Validity</span>
              <span className="text-xs text-muted-foreground">
                {isEvaluating ? "Analysing with AI..." : "Generate PDF analysis"}
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Custom Export Options
            </DialogTitle>
            <DialogDescription>
              Configure your export preferences and download the traversal data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Format</Label>
              <div className="space-y-2">
                {['json', 'csv', 'summary'].map((format) => (
                  <div key={format} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={format}
                      name="format"
                      value={format}
                      checked={customOptions.format === format}
                      onChange={(e) => setCustomOptions(prev => ({ 
                        ...prev, 
                        format: e.target.value as typeof prev.format 
                      }))}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={format} className="flex items-center gap-2 cursor-pointer">
                      {getFormatIcon(format)}
                      <div className="flex flex-col">
                        <span className="text-sm font-medium uppercase">{format}</span>
                        <span className="text-xs text-muted-foreground">
                          {getFormatDescription(format)}
                        </span>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Content Options</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeFullContent"
                    checked={customOptions.includeFullContent}
                    onCheckedChange={(checked) => 
                      setCustomOptions(prev => ({ 
                        ...prev, 
                        includeFullContent: checked as boolean 
                      }))
                    }
                  />
                  <Label htmlFor="includeFullContent" className="text-sm">
                    Include full legal text content
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeMetadata"
                    checked={customOptions.includeMetadata}
                    onCheckedChange={(checked) => 
                      setCustomOptions(prev => ({ 
                        ...prev, 
                        includeMetadata: checked as boolean 
                      }))
                    }
                  />
                  <Label htmlFor="includeMetadata" className="text-sm">
                    Include detailed node metadata
                  </Label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleCustomExport}
                disabled={isLoading || isEvaluating}
                className="flex-1 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isLoading ? "Exporting..." : "Export"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCustomDialog(false)}
                disabled={isLoading || isEvaluating}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 