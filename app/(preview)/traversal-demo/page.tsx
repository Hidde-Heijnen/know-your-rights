"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Play, RefreshCw } from "lucide-react";
import { TraversalVisualizer } from "@/components/traversal-visualizer";
import { TraversalTreeVisualizer } from "@/components/traversal-tree-visualizer";
import { TraversalExportButton } from "@/components/traversal-export-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLegalTraversal } from "@/hooks/use-legal-traversal";

// Example case scenarios
const exampleCases = [
  {
    title: "Refund for Unopened Item",
    data: {
      issue: "refund",
      purchaseDate: "2024-01-15",
      itemCondition: "unopened",
      reason: "changed mind",
      category: "electronics"
    }
  },
  {
    title: "Faulty Product Return",
    data: {
      issue: "faulty product",
      purchaseDate: "2024-01-10",
      faultDescription: "screen not working",
      warrantyStatus: "under warranty",
      category: "electronics"
    }
  },
  {
    title: "Service Cancellation",
    data: {
      issue: "service cancellation",
      contractStartDate: "2023-12-01",
      cancellationReason: "poor service quality",
      contractType: "monthly subscription",
      category: "telecommunications"
    }
  }
];

export default function TraversalDemoPage() {
  const [caseInput, setCaseInput] = useState(JSON.stringify(exampleCases[0].data, null, 2));
  const { traverseDocument, isLoading, result, error, reset } = useLegalTraversal({
    maxDepth: 8,
    onSuccess: (result) => {
      console.log("Traversal completed:", result);
    },
    onError: (error) => {
      console.error("Traversal error:", error);
    }
  });

  const handleTraverse = async () => {
    try {
      const caseData = JSON.parse(caseInput);
      await traverseDocument(caseData);
    } catch (err) {
      alert("Invalid JSON format. Please check your input.");
    }
  };

  const loadExample = (example: typeof exampleCases[0]) => {
    setCaseInput(JSON.stringify(example.data, null, 2));
    reset();
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Legal Document Traversal Demo</h1>
        <p className="text-muted-foreground">
          Test the breadth-first search traversal of legal documentation based on case information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Case Information</CardTitle>
              <CardDescription>
                Enter the case details in JSON format or select an example
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Example Cases</Label>
                <div className="flex flex-wrap gap-2">
                  {exampleCases.map((example, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => loadExample(example)}
                    >
                      {example.title}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="case-input">Case Data (JSON)</Label>
                <Textarea
                  id="case-input"
                  value={caseInput}
                  onChange={(e) => setCaseInput(e.target.value)}
                  className="font-mono text-sm h-64"
                  placeholder="Enter case information in JSON format..."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleTraverse}
                  disabled={isLoading || !caseInput.trim()}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Traversing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Traversal
                    </>
                  )}
                </Button>
                <Button
                  onClick={reset}
                  variant="outline"
                  disabled={isLoading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Traversal Results</h2>
                <TraversalExportButton 
                  exportAvailable={Boolean(result)} 
                  disabled={isLoading}
                />
              </div>
              
              <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="list">List View</TabsTrigger>
                  <TabsTrigger value="tree">Tree View</TabsTrigger>
                </TabsList>
                <TabsContent value="list">
                  <TraversalVisualizer
                    traversalPath={result.traversalPath}
                    relevantNodes={result.relevantNodes}
                    finalRecommendation={result.finalRecommendation}
                  />
                </TabsContent>
                <TabsContent value="tree">
                  {result.documentNodes ? (
                    <TraversalTreeVisualizer
                      traversalPath={result.traversalPath}
                      relevantNodes={result.relevantNodes}
                      documentNodes={result.documentNodes}
                    />
                  ) : (
                    <Card>
                      <CardContent className="py-8">
                        <p className="text-center text-muted-foreground">
                          Document structure not available for tree visualization
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Results will appear here after traversal
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Debug Information */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>
              Raw traversal visualization for debugging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto bg-muted p-4 rounded-lg">
              {(result as any).visualization || "No visualization available"}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 