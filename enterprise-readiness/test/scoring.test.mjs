import test from "node:test"; import assert from "node:assert/strict"; import { calculateScore } from "../src/scoring.mjs";
test("provisional model resolves to approximately 56/100",()=>{const result=calculateScore();assert.equal(result.score100,56.1);assert.equal(result.classification,"Advanced candidate architecture");assert.equal(result.totalWeight,100)});
test("scores outside 0-5 fail closed",()=>assert.throws(()=>calculateScore({domains:[{id:"x",weight:100,score:6}]}),/between 0 and 5/));
