// =========================
// Configuration Variables
// =========================
const fs = require('fs');
const path = require('path');

const NUM_PEOPLE = 50; // Number of unique users
const MAX_REPLIES = 10; // Max replies to a single person
const TOTAL_INTERACTIONS = 40; // Total number of interactions
const DATA_FILE = path.join(__dirname, 'data.json');

// =========================
// Helper Functions
// =========================

// Generate unique random names
const usedNames = new Set();
function trulyUniqueName() {
  const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery', 'Drew'];
  const lastNames = ['Smith', 'Johnson', 'Lee', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Clark'];
  let name;
  do {
    name =
      firstNames[Math.floor(Math.random() * firstNames.length)] +
      ' ' +
      lastNames[Math.floor(Math.random() * lastNames.length)];
  } while (usedNames.has(name));
  usedNames.add(name);
  return name;
}

// Generate undirected interactions
function generateInteractions(numPeople, maxReplies, totalInteractions) {
  const interactions = new Set();
  const replyCounts = Array.from({ length: numPeople + 1 }, () => ({}));

  while (interactions.size < totalInteractions) {
    let a = Math.ceil(Math.random() * numPeople);
    let b = Math.ceil(Math.random() * numPeople);
    if (a === b) continue;
    // Always store as [min, max] for undirected
    const pair = a < b ? [a, b] : [b, a];
    const key = pair.join('-');
    // Check max replies
    if (
      (replyCounts[pair[0]][pair[1]] || 0) >= maxReplies ||
      (replyCounts[pair[1]][pair[0]] || 0) >= maxReplies
    ) {
      continue;
    }
    if (!interactions.has(key)) {
      interactions.add(key);
      replyCounts[pair[0]][pair[1]] = (replyCounts[pair[0]][pair[1]] || 0) + 1;
      replyCounts[pair[1]][pair[0]] = (replyCounts[pair[1]][pair[0]] || 0) + 1;
    }
  }
  // Convert to array of objects { source, target, value }
  return Array.from(interactions).map((k) => {
    const [source, target] = k.split('-').map(Number);
    return { source, target, value: 1 };
  });
}

// Union-find helpers for group assignment
function createDisjointSet(ids) {
  const parent = {};
  ids.forEach(id => { parent[id] = id; });
  return parent;
}

function find(parent, id) {
  if (parent[id] !== id) {
    parent[id] = find(parent, parent[id]);
  }
  return parent[id];
}

function union(parent, id1, id2) {
  const root1 = find(parent, id1);
  const root2 = find(parent, id2);
  if (root1 !== root2) {
    parent[root2] = root1;
  }
}

// =========================
// Main Data Generation Logic
// =========================

// 1. Generate interactions (links)
let links = generateInteractions(NUM_PEOPLE, MAX_REPLIES, TOTAL_INTERACTIONS);
// Sort links by the numerical value of the first entry, then second entry
links = links.sort((a, b) => {
  if (a.source !== b.source) return a.source - b.source;
  return a.target - b.target;
});

// 2. Collect unique user IDs
const uniqueIds = Array.from(new Set(links.flatMap(l => [l.source, l.target])));

// 3. Assign groups using union-find (connected components)
const parent = createDisjointSet(uniqueIds);
links.forEach(link => union(parent, link.source, link.target));
// Map each root to a group number
const groupMap = {};
let groupNum = 1;
uniqueIds.forEach(id => {
  const root = find(parent, id);
  if (!(root in groupMap)) {
    groupMap[root] = groupNum++;
  }
});

// 4. Generate users with group assignment
let users = uniqueIds.map(id => ({ id, name: trulyUniqueName(), group: groupMap[find(parent, id)] }));
// Sort users by id (numerically)
users = users.sort((a, b) => a.id - b.id);

// 5. Write both users and links to data.json
const output = { users, links };
fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2));
console.log('Generated data.json with users and links.'); 