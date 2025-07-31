// =========================
// Configuration Variables
// =========================
const fs = require('fs')
const path = require('path')

const NUM_PEOPLE = 150 // Number of unique users
const TOTAL_INTERACTIONS = 300 // Total number of interactions
const NUM_ASSIGNMENTS = 5 // Number of different assignment IDs
const DATA_FILE = path.join(__dirname, 'data.json')

// =========================
// Optimized Helper Functions
// =========================

// Pre-computed name arrays for faster access
const FIRST_NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery', 'Drew']
const LAST_NAMES = ['Smith', 'Johnson', 'Lee', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Clark']
const FIRST_NAMES_LENGTH = FIRST_NAMES.length
const LAST_NAMES_LENGTH = LAST_NAMES.length

// Pre-generate all possible names to avoid collision checking
const ALL_NAMES = new Set()
for (let i = 0; i < FIRST_NAMES_LENGTH; i++) {
  for (let j = 0; j < LAST_NAMES_LENGTH; j++) {
    ALL_NAMES.add(`${FIRST_NAMES[i]} ${LAST_NAMES[j]}`)
  }
}
const NAME_ARRAY = Array.from(ALL_NAMES)

// Generate unique random names using pre-computed array
function generateUniqueName () {
  return NAME_ARRAY[Math.floor(Math.random() * NAME_ARRAY.length)]
}

// Optimized interaction generation using Fisher-Yates shuffle
function generateInteractions (numPeople, totalInteractions, numAssignments) {
  // Pre-calculate all possible pairs to avoid collision checking
  const allPossiblePairs = []
  for (let i = 1; i <= numPeople; i++) {
    for (let j = i + 1; j <= numPeople; j++) {
      allPossiblePairs.push([i, j])
    }
  }

  // Fisher-Yates shuffle to get random pairs efficiently
  const shuffledPairs = [...allPossiblePairs]
  for (let i = shuffledPairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPairs[i], shuffledPairs[j]] = [shuffledPairs[j], shuffledPairs[i]]
  }

  // Take the first totalInteractions pairs
  const selectedPairs = shuffledPairs.slice(0, totalInteractions)

  // Convert to final format with assignment IDs
  return selectedPairs.map(([user1, user2], index) => ({
    user1,
    user2,
    assignmentId: (index % numAssignments) + 1,
    value: 'Text Placeholder'
  }))
}

// Optimized assignments generation
function generateAssignments (numAssignments) {
  const assignments = new Array(numAssignments)
  for (let i = 0; i < numAssignments; i++) {
    assignments[i] = {
      assignmentId: i + 1,
      title: `Assignment ${i + 1}`
    }
  }
  return assignments
}

// Optimized union-find with path compression and union by rank
// Currently deprecated with plan to re-use this functionality later on
class UnionFind {
  constructor (size) {
    this.parent = new Array(size + 1)
    this.rank = new Array(size + 1)
    for (let i = 1; i <= size; i++) {
      this.parent[i] = i
      this.rank[i] = 0
    }
  }

  find (id) {
    if (this.parent[id] !== id) {
      this.parent[id] = this.find(this.parent[id]) // Path compression
    }
    return this.parent[id]
  }

  union (id1, id2) {
    const root1 = this.find(id1)
    const root2 = this.find(id2)
    if (root1 !== root2) {
      if (this.rank[root1] < this.rank[root2]) {
        this.parent[root1] = root2
      } else if (this.rank[root1] > this.rank[root2]) {
        this.parent[root2] = root1
      } else {
        this.parent[root2] = root1
        this.rank[root1]++
      }
    }
  }
}

// =========================
// Optimized Main Data Generation Logic
// =========================

// 1. Generate all users efficiently
const users = new Array(NUM_PEOPLE)
for (let i = 0; i < NUM_PEOPLE; i++) {
  users[i] = {
    id: i + 1,
    name: generateUniqueName()
  }
}

// 2. Generate interactions efficiently
const links = generateInteractions(NUM_PEOPLE, TOTAL_INTERACTIONS, NUM_ASSIGNMENTS)

// 3. Collect unique user IDs from interactions using Set for O(1) lookup
const uniqueIdsInInteractions = new Set()
for (const link of links) {
  uniqueIdsInInteractions.add(link.user1)
  uniqueIdsInInteractions.add(link.user2)
}

// 4. Generate assignments
const assignments = generateAssignments(NUM_ASSIGNMENTS)

// 5. Write to file efficiently
const output = { users, links, assignments }
fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2))

console.log(`Generated data.json with ${users.length} users, ${links.length} links, and ${NUM_ASSIGNMENTS} assignments.`)
console.log(`Users in interactions: ${uniqueIdsInInteractions.size}, Users not in interactions: ${users.length - uniqueIdsInInteractions.size}`)
