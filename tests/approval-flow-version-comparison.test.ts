import assert from "node:assert/strict";
import test from "node:test";

import { compareApprovalFlowGraphs } from "../lib/approval-flows";

test("approval flow version comparison highlights structural drift", () => {
  const draftGraph = JSON.stringify({
    nodes: [
      { id: "start" },
      { id: "manager" },
      { id: "end" }
    ],
    edges: [
      { id: "e1", sourceNodeId: "start", targetNodeId: "manager" },
      { id: "e2", sourceNodeId: "manager", targetNodeId: "end" }
    ]
  });
  const publishedGraph = JSON.stringify({
    nodes: [{ id: "start" }, { id: "end" }],
    edges: [{ id: "e1", sourceNodeId: "start", targetNodeId: "end" }]
  });

  const comparison = compareApprovalFlowGraphs(draftGraph, publishedGraph);

  assert.equal(comparison.hasChanges, true);
  assert.equal(comparison.nodeDelta, 1);
  assert.equal(comparison.edgeDelta, 1);
  assert.deepEqual(comparison.draftOnlyNodeIds, ["manager"]);
  assert.deepEqual(comparison.draftOnlyEdgeIds, ["e2"]);
  assert.deepEqual(comparison.publishedOnlyNodeIds, []);
  assert.deepEqual(comparison.publishedOnlyEdgeIds, []);
});

test("approval flow version comparison stays quiet when graphs match", () => {
  const graph = JSON.stringify({
    nodes: [{ id: "start" }, { id: "end" }],
    edges: [{ id: "e1", sourceNodeId: "start", targetNodeId: "end" }]
  });

  const comparison = compareApprovalFlowGraphs(graph, graph);

  assert.equal(comparison.hasChanges, false);
  assert.equal(comparison.nodeDelta, 0);
  assert.equal(comparison.edgeDelta, 0);
  assert.deepEqual(comparison.draftOnlyNodeIds, []);
  assert.deepEqual(comparison.publishedOnlyNodeIds, []);
});
