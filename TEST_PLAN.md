# Test Plan - AI System Architecture Fix

## Pre-Test Setup

1. Deploy updated backend code
2. Ensure database is accessible
3. Have test WhatsApp account ready
4. Enable verbose logging
5. Monitor logs during testing

---

## Unit Tests

### Test Suite 1: Intent Detection

#### Test 1.1: Company Intent Detection
```typescript
Test: detectCompanyIntent("Send me office address")
Expected: { intent: 'company', confidence: 'high' }

Test: detectCompanyIntent("What is your phone number?")
Expected: { intent: 'company', confidence: 'high' }

Test: detectCompanyIntent("Where are you located?")
Expected: { intent: 'company', confidence: 'high' }

Test: detectCompanyIntent("Send me the website")
Expected: { intent: 'company', confidence: 'high' }

// False positive check
Test: detectCompanyIntent("Address in Burj Khalifa")
Expected: { intent: 'property', confidence: 'high' }
          (NOT company - this is property search)
```

#### Test 1.2: Agent Intent Detection
```typescript
Test: detectAgentIntentFromMessage("Connect me with an agent")
Expected: { intent: 'agent', confidence: 'high' }

Test: detectAgentIntentFromMessage("I want to speak to Hammad")
Expected: { intent: 'agent', confidence: 'high' }

Test: detectAgentIntentFromMessage("Get me a consultant")
Expected: { intent: 'agent', confidence: 'high' }

Test: detectAgentIntentFromMessage("This is useless, I need a human")
Expected: { intent: 'agent', confidence: 'high' }
```

#### Test 1.3: Property Intent Detection
```typescript
Test: detectPropertySearchIntent("Show me properties in Marina")
Expected: { intent: 'property', confidence: 'high' }

Test: detectPropertySearchIntent("I want a 2BR apartment")
Expected: { intent: 'property', confidence: 'high' }

Test: detectPropertySearchIntent("Find me villas under 5M")
Expected: { intent: 'property', confidence: 'high' }

Test: detectPropertySearchIntent("What studios are available?")
Expected: { intent: 'property', confidence: 'high' }
```

#### Test 1.4: FAQ Intent Detection
```typescript
Test: detectFaqIntent("What is the DLD fee?")
Expected: { intent: 'faq', confidence: 'high' }

Test: detectFaqIntent("How does mortgage work?")
Expected: { intent: 'faq', confidence: 'high' }

Test: detectFaqIntent("Best area for ROI?")
Expected: { intent: 'faq', confidence: 'high' }
```

---

## Integration Tests

### Test Suite 2: Routing Layer

#### Test 2.1: Company Routing
```
Input:
  message: "Send me office address"
  orgId: "test-org-123"
  memory: {}

Expected Output:
  {
    type: 'direct',
    content: '[Company info with address]',
    language: 'en'
  }

Verify:
  ✓ No AI API call made
  ✓ Response includes Concord Tower address
  ✓ Response includes phone number
  ✓ Response instant (< 100ms)
```

#### Test 2.2: Agent Routing
```
Input:
  message: "Connect me with agent"
  orgId: "test-org-123"
  memory: { area: "Marina", maxBudget: 3000000 }

Expected Output:
  {
    type: 'direct',
    content: '[Agent card]',
    language: 'en',
    metadata: { agent: { name, phone } }
  }

Verify:
  ✓ No AI API call made
  ✓ Agent details included
  ✓ Best agent selected based on area/budget
```

#### Test 2.3: Property Routing (No Results)
```
Input:
  message: "Properties in Narnia"
  orgId: "test-org-123"
  memory: {}

Expected Output:
  {
    type: 'query',
    data: {
      found: false,
      message: "No properties available"
    },
    language: 'en'
  }

Verify:
  ✓ Database queried
  ✓ No hallucinated prices
  ✓ No AI called
  ✓ Error message returned
```

#### Test 2.4: Property Routing (With Results)
```
Input:
  message: "2BR apartments in Marina under 3M"
  orgId: "test-org-123"
  memory: {}

Expected Output:
  {
    type: 'query',
    data: {
      found: true,
      count: 3,
      properties: [
        { ref_number, price_aed, bedrooms, ... },
        ...
      ]
    },
    language: 'en'
  }

Verify:
  ✓ Database queried with filters
  ✓ 3 results returned
  ✓ Results deferred to AI (NOT included in this response)
  ✓ Prices from database (NOT hallucinated)
```

---

## End-to-End (E2E) Tests

### Test Suite 3: Full Message Flow

#### Test 3.1: E2E Company Request
```
GIVEN: User sends "What is your office address?"
WHEN:  Message is received by WhatsApp gateway
THEN:
  1. MessageRouter receives message
  2. generateReply() is called
  3. routeByIntent() returns direct response
  4. aiService skips AI call
  5. Response sent: "[Company address]"
  
VERIFY:
  ✓ No AI API log entry
  ✓ Response sent within 1 second
  ✓ Correct address in response
  ✓ No database query logged
```

#### Test 3.2: E2E Property Search (Empty)
```
GIVEN: User sends "Show me properties on Mars"
WHEN:  Message is received by WhatsApp gateway
THEN:
  1. MessageRouter receives message
  2. generateReply() is called
  3. routeByIntent() queries database
  4. No results found
  5. Response sent: "No properties available"
  
VERIFY:
  ✓ Database query logged
  ✓ No AI API call made
  ✓ No prices/data hallucinated
  ✓ Error message returned
```

#### Test 3.3: E2E Property Search (With Results)
```
GIVEN: User sends "2BR apartments in Downtown Dubai"
WHEN:  Message is received by WhatsApp gateway
THEN:
  1. MessageRouter receives message
  2. generateReply() is called
  3. routeByIntent() queries database
  4. 3 results found
  5. AI called to format results
  6. Response sent: "[Formatted properties]"
  
VERIFY:
  ✓ Database query logged
  ✓ AI API call made (for formatting only)
  ✓ Prices from database (not AI-generated)
  ✓ Formatted nicely for user
```

#### Test 3.4: E2E Agent Request
```
GIVEN: User sends "I want to speak to Waheed"
WHEN:  Message is received by WhatsApp gateway
THEN:
  1. MessageRouter receives message
  2. generateReply() is called
  3. routeByIntent() returns agent card
  4. Response sent: "[Waheed's contact]"
  
VERIFY:
  ✓ Agent name recognized
  ✓ Agent details included
  ✓ No AI API call made
  ✓ Handoff flagged in metadata
```

---

## Regression Tests

### Test Suite 4: Existing Functionality

#### Test 4.1: FAQ Still Works
```
GIVEN: User sends "How does mortgage work?"
WHEN:  Message processed
THEN:  AI provides answer from knowledge base

VERIFY:
  ✓ FAQ detection works
  ✓ AI is called (for FAQ)
  ✓ Answer provided
```

#### Test 4.2: General Chat Still Works
```
GIVEN: User sends "Tell me a joke"
WHEN:  Message processed
THEN:  AI responds with joke

VERIFY:
  ✓ General intent detected
  ✓ AI is called (for general)
  ✓ Response provided
```

#### Test 4.3: Conversation History Works
```
GIVEN: Multi-turn conversation
  User: "Show me properties in Marina"
  User: "Any villas?"
WHEN:  Messages processed
THEN:  Both work correctly with context

VERIFY:
  ✓ First message queries DB
  ✓ Second message understands "any villas" = property search
  ✓ Area persists in memory
```

---

## Negative Tests

### Test Suite 5: Error Handling

#### Test 5.1: Database Connection Error
```
Input: Property search when DB is down
Expected: Error message (no AI hallucination)
Verify: ✓ Graceful error handling
        ✓ No properties hallucinated
```

#### Test 5.2: Ambiguous Message
```
Input: "Address" (single word, ambiguous)
Expected: Treated as company request (high priority)
Verify: ✓ Priority order respected
```

#### Test 5.3: Mixed Intent
```
Input: "Send me properties in Marina"
Expected: Treated as property search (company + property)
Verify: ✓ Property takes precedence over company modifier
```

---

## Performance Tests

### Test Suite 6: Performance Metrics

#### Test 6.1: Company Request Speed
```
Measure: Time for "Send me office address"
Expected: < 150ms (no AI call)
Baseline: Was ~2000ms (AI call)
Target: 95% faster
```

#### Test 6.2: Empty Property Search Speed
```
Measure: Time for properties with no results
Expected: < 500ms (DB query only)
Baseline: Was ~2000ms (AI hallucination + retries)
Target: 75% faster
```

#### Test 6.3: API Call Reduction
```
Measure: AI API calls per 100 messages
Expected: ~30 calls (down from 80)
Baseline: Was ~80 calls (every message routed to AI)
Target: 62% fewer calls
```

---

## Language Tests

### Test Suite 7: Arabic/English Support

#### Test 7.1: Arabic Company Request
```
Input: "أرسل لي عنوان المكتب"
Expected: Arabic response with company address
Verify: ✓ Language detected correctly
        ✓ Arabic response provided
        ✓ No AI called
```

#### Test 7.2: Arabic Property Search
```
Input: "شقق في البحيرة"
Expected: Arabic response for Marina properties
Verify: ✓ Language detected
        ✓ Database query works
        ✓ Arabic formatting
```

#### Test 7.3: Mixed Language
```
Input: "2BR apartments في Marina"
Expected: Treat as English (Arabic words in English context)
Verify: ✓ Correct language detection
```

---

## Checklist for Test Execution

### Pre-Test
- [ ] Backend deployed with new code
- [ ] Database accessible and populated
- [ ] Logging enabled (verbose mode)
- [ ] Test account ready
- [ ] Monitor set up
- [ ] Expected outputs documented

### Unit Tests
- [ ] All intent detection tests pass
- [ ] All routing tests pass
- [ ] Handler outputs correct
- [ ] No unexpected errors

### Integration Tests
- [ ] Routing layer works end-to-end
- [ ] Database queries execute
- [ ] AI calls only when needed
- [ ] Responses formatted correctly

### E2E Tests
- [ ] Company requests work
- [ ] Agent requests work
- [ ] Property searches work (both empty & with results)
- [ ] Conversation history preserved
- [ ] Handoff mechanism works

### Regression Tests
- [ ] FAQ still works
- [ ] General chat still works
- [ ] Conversation context maintained

### Performance Tests
- [ ] Company requests faster (< 150ms)
- [ ] Empty searches faster (< 500ms)
- [ ] API calls reduced
- [ ] No timeouts

### Language Tests
- [ ] English responses work
- [ ] Arabic responses work
- [ ] Language detection accurate

### Post-Test
- [ ] All logs reviewed
- [ ] No hallucinated data
- [ ] No false positives
- [ ] Response quality acceptable
- [ ] Performance metrics met
- [ ] Ready for production

---

## Known Limitations & Edge Cases

1. **Ambiguous single words**
   - "Address" alone → company (high priority)
   - "Properties" alone → property (correct)
   - "Show" alone → general (defer to AI)

2. **Mixed intents**
   - "Send me properties" → property (property takes precedence)
   - "Office in Marina" → company (company takes precedence)
   - Context matters!

3. **New/Unknown areas**
   - If area not in database → "no properties in [area]"
   - System doesn't guess or hallucinate areas

4. **Database edge cases**
   - No properties available → instant "no properties" response
   - Single property → still formatted by AI
   - Massive result set → still limited to top 3

---

## Success Criteria

✅ **All tests pass**
✅ **No hallucinated property data**
✅ **Company requests don't reach AI**
✅ **Empty property results blocked**
✅ **Performance improved by 75%+**
✅ **API calls reduced by 60%+**
✅ **All existing functionality preserved**
✅ **Logs show proper routing**
✅ **No false positives in detection**
✅ **Response quality maintained**

---

## Rollback Criteria

If any of these occur, rollback immediately:

❌ Company requests still returning properties
❌ Fake property prices still being generated  
❌ Database connection errors crashing system
❌ Critical intent detection failures
❌ Performance regression
❌ Existing functionality broken

---

## Test Report Template

```
Date: [DATE]
Tester: [NAME]
Environment: [DEV/STAGING/PROD]
Deployment: [VERSION]

Unit Tests: [PASS/FAIL] - [X/Y tests passed]
Integration Tests: [PASS/FAIL] - [X/Y tests passed]
E2E Tests: [PASS/FAIL] - [X/Y tests passed]
Regression Tests: [PASS/FAIL] - [X/Y tests passed]
Performance Tests: [PASS/FAIL] - [X/Y tests passed]
Language Tests: [PASS/FAIL] - [X/Y tests passed]

Overall: [PASS/FAIL]

Issues Found:
- [Issue 1]
- [Issue 2]

Notes:
[Additional notes]

Recommendation: [Deploy/Fix/Rollback]
```
