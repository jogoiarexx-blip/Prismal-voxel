'use strict';
importScripts('world.js');
const terrainCache = new Map();
self.onmessage = ({ data }) => {
  const result = Voxel.makeJob(data, terrainCache);
  self.postMessage(result, [result.a.buffer, result.solid.buffer, result.alpha.buffer]);
};
