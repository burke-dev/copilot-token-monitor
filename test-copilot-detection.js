// Test file for Copilot Token Monitor Extension
// Use this file to test token detection accuracy

// ==============================================================================
// TEST 1: Simple inline completion (should detect ~50-100 tokens)
// ==============================================================================
// Instructions: Start typing "function calculateTotal" and accept Copilot suggestion
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ==============================================================================
// TEST 2: Medium function generation (should detect ~100-200 tokens)
// ==============================================================================
function sortByProperty(array, property) {
  return array.sort((a, b) => {
    if (a[property] < b[property]) return -1;
    if (a[property] > b[property]) return 1;
    return 0;
  });
}

// ==============================================================================
// TEST 3: Small class with methods (should detect ~200-400 tokens)
// ==============================================================================
class UserManager {
  constructor() {
    this.users = [];
  }

  addUser(user) {
    this.users.push(user);
  }

  removeUser(id) {
    this.users = this.users.filter((user) => user.id !== id);
  }

  findUser(id) {
    return this.users.find((user) => user.id === id);
  }

  getAllUsers() {
    return [...this.users];
  }
}

// ==============================================================================
// TEST 4: Manual typing test (should NOT be detected - too small)
// ==============================================================================
// Instructions: Type this manually, character by character slowly:
// const manualTest = 123;


// ==============================================================================
// TEST 5: Large REST API class (should detect ~600-1000 tokens)
// ==============================================================================
// Instructions: Delete this entire class and ask Copilot to regenerate it
class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async get(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`GET request failed: ${response.status}`);
    }
    return response.json();
  }

  async post(endpoint, data) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`POST request failed: ${response.status}`);
    }
    return response.json();
  }

  async put(endpoint, data) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`PUT request failed: ${response.status}`);
    }
    return response.json();
  }

  async delete(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`DELETE request failed: ${response.status}`);
    }
    return response.json();
  }
}

// ==============================================================================
// TEST 6: Calculator with method chaining (should detect ~400-600 tokens)
// ==============================================================================
class Calculator {
  constructor() {
    this.result = 0;
  }

  add(value) {
    this.result += value;
    return this;
  }

  subtract(value) {
    this.result -= value;
    return this;
  }

  multiply(value) {
    this.result *= value;
    return this;
  }

  divide(value) {
    if (value !== 0) {
      this.result /= value;
    }
    return this;
  }

  getResult() {
    return this.result;
  }

  reset() {
    this.result = 0;
    return this;
  }
}

// ==============================================================================
// TEST 7: Async error handling (should detect ~200-300 tokens)
// ==============================================================================
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

// ==============================================================================
// TESTING INSTRUCTIONS
// ==============================================================================
// 1. Open this file in the Extension Development Host
// 2. Check status bar (bottom-right) for the token monitor indicator
// 3. Try these experiments:
//    - Delete APIClient class and regenerate with Copilot
//    - Type small changes manually (should not count)
//    - Use inline chat (Cmd+I) to generate new functions
//    - Accept Copilot inline completions
// 4. View logs: Command Palette → "Copilot Token Monitor: Show Logs"
// 5. View details: Command Palette → "Copilot Token Monitor: Show Details"
//
// Expected behavior:
// ✅ Large insertions (>100 chars) are detected
// ✅ Multi-line completions are detected
// ✅ Rapid successive changes are detected
// ❌ Small manual typing is filtered out
//
// Add your test code below:
// ==============================================================================

