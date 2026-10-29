#!/usr/bin/env python3
"""
Test Suite: Phase 7 — WhatsApp Flow Automation Builder & Reliable CSV Runtime Integration
Verifies:
1. Baseline record preservation (212 listings, 211 contacts, 4 deals, 179 draft automations, 4 territories)
2. Robust CSV Parser handling all 39 rows of sample_flows.csv with 0 errors
3. Step 2 Multi-Feature CSV Fixture End-to-End (Telugu, quotes, buttons, lists, video, listing)
4. API Route (/api/crm/flows): GET, dryRun POST, single flow CRUD, status toggle, DELETE
5. Pure Flow Runtime Evaluator (evaluateFlow): draft/paused suppression, published keyword match, button reply transition, variable interpolation, listing binding
6. Webhook Integration: inbound text and interactive button clicks execute published flows with honest delivery logging
7. Flow Dry-Run Route (/api/crm/flows/dry-run): candidate simulation, listing resolution, territory isolation (403), honest provider delivery
8. Runtime Media and WhatsApp Payload Compliance across 6 media permutations
9. End-to-end baseline counts and state integrity verification (all 179 automations draft/inactive)
"""

import os
import sys
import json
import shutil
import tempfile
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = SCRIPT_DIR
DATA_FILE = os.path.join(PROJECT_DIR, 'data', 'admin_data.json')

TEMP_DATA_DIR = tempfile.mkdtemp(prefix='crm_phase7_test_')
TEMP_DATA_FILE = os.path.join(TEMP_DATA_DIR, 'admin_data.json')
shutil.copy2(DATA_FILE, TEMP_DATA_FILE)

def run_node_ts(code_snippet):
    cmd = [
        'node',
        '--loader', './scripts/ts-loader.mjs',
        '-e', code_snippet
    ]
    env = os.environ.copy()
    env['CRM_DATA_FILE'] = TEMP_DATA_FILE
    p = subprocess.run(cmd, cwd=PROJECT_DIR, capture_output=True, text=True, env=env)
    return p.returncode, p.stdout, p.stderr

def test_baseline_preservation():
    print("=== Test 1: Baseline Record Verification ===")
    assert os.path.exists(DATA_FILE), f"Missing {DATA_FILE}"
    with open(DATA_FILE, 'r') as f:
        data = json.load(f)

    listings_cnt = len(data.get('listings', []))
    contacts_cnt = len(data.get('contacts', []))
    deals_cnt = len(data.get('deals', []))
    automations_cnt = len(data.get('automations', []))
    territories_cnt = len(data.get('territories', []))
    flows_cnt = len(data.get('flows', []))

    print(f"Listings: {listings_cnt}")
    print(f"Contacts: {contacts_cnt}")
    print(f"Deals: {deals_cnt}")
    print(f"Automations: {automations_cnt}")
    print(f"Territories: {territories_cnt}")
    print(f"Flows: {flows_cnt}")

    assert listings_cnt == 212, f"Expected 212 listings, got {listings_cnt}"
    assert contacts_cnt == 211, f"Expected 211 contacts, got {contacts_cnt}"
    assert deals_cnt == 4, f"Expected 4 deals, got {deals_cnt}"
    assert automations_cnt == 179, f"Expected 179 automations, got {automations_cnt}"
    assert territories_cnt == 4, f"Expected 4 territories, got {territories_cnt}"
    assert flows_cnt >= 1, f"Expected at least 1 baseline flow, got {flows_cnt}"
    print("✓ Test 1 Passed: Baseline counts verified.\n")

def test_csv_parser_39_flows():
    print("=== Test 2: CSV Parser on sample_flows.csv (39 Flows) ===")
    code = """
import fs from 'fs'
import { parseFlowCsvContent } from './src/lib/parse-flow-csv.ts'

const csv = fs.readFileSync('public/csv/sample_flows.csv', 'utf-8')
const { flows, errors } = parseFlowCsvContent(csv, { defaultStatus: 'draft' })

if (errors.length > 0) {
  console.error('PARSE_ERRORS:', JSON.stringify(errors))
  process.exit(1)
}

if (flows.length !== 39) {
  console.error(`Expected 39 flows, got ${flows.length}`)
  process.exit(2)
}

// Check Telugu text preservation
const welcome = flows[0]
if (!welcome.initial_message || !welcome.initial_message.includes('నమస్కారం! చౌటుప్పల్ యాప్ కి స్వాగతం')) {
  console.error('Telugu initial_message corrupted or missing in Welcome Flow')
  process.exit(3)
}

// Check deterministic ID
if (welcome.id !== 'flow_welcome_flow') {
  console.error(`Expected deterministic id 'flow_welcome_flow', got ${welcome.id}`)
  process.exit(4)
}

// Check default status is draft
if (welcome.status !== 'draft') {
  console.error(`Expected default status 'draft', got ${welcome.status}`)
  process.exit(5)
}

// Check auto-linking
const welcome2 = flows[1] // Welcome Step 2
const btn1 = welcome2.nodes.find(n => n.id === 'entry_message')?.config?.buttons?.[0]
if (!btn1 || !btn1.nextNodeId || !btn1.nextNodeId.includes('forced_gate_govt')) {
  console.error('Auto-linking failed: button "ప్రభుత్వ సేవలు" not linked to forced_gate_govt', btn1)
  process.exit(6)
}

console.log('CSV_PARSER_OK: flows=' + flows.length)
"""
    code_rc, out, err = run_node_ts(code)
    print("STDOUT:", out.strip())
    if code_rc != 0:
        print("STDERR:", err)
    assert code_rc == 0, f"CSV Parser test failed with code {code_rc}"
    assert "CSV_PARSER_OK: flows=39" in out
    print("✓ Test 2 Passed: 39 flows parsed with Telugu Unicode and auto-linking verified.\n")

def test_step2_csv_fixture_end_to_end():
    print("=== Test 3: Step 2 Multi-Feature CSV Fixture End-to-End ===")
    code = r"""
import { parseFlowCsvContent } from './src/lib/parse-flow-csv.ts'
import { evaluateFlow } from './src/lib/flow-runtime-engine.ts'
import { FLAGSHIP_CHOUTUPPAL_TERRITORY } from './src/lib/store.ts'

const testCsv = `name,trigger_type,trigger_keywords,initial_message,button_options,button_payloads,next_node_ids,image_url,media_url,media_type,listing_id,status,template_slug
English Welcome,keyword,"welcome, hello","Welcome to Choutuppal CRM! We connect you with local doctors, shops, and services. ""Your reliable community partner.""
Need help? Select an option below:","Services;Offers;Support","PAYLOAD_SERVICES;PAYLOAD_OFFERS;PAYLOAD_SUPPORT","action_services;action_offers;action_support","https://images.unsplash.com/photo-1.jpg","",image,"",draft,welcome_menu
Telugu Video Tour,keyword,"వీడియో, tour","నమస్కారం! చౌటుప్పల్ పట్టణ పర్యటన వీడియో ఇక్కడ చూడండి: ""డిజిటల్ చౌటుప్పల్"".
మరిన్ని వివరాల కోసం క్రింది బటన్ నొక్కండి.","మరిన్ని వివరాలు;వెనుకకు","PAYLOAD_DETAILS;PAYLOAD_BACK","action_details;action_back","","https://example.com/choutuppal_tour.mp4",video,"",draft,welcome_menu
Pharmacy Finder,keyword,"pharmacy, మందులు","హాస్పిటల్ & మందుల దుకాణం: {{listing.title}}
ఫోన్: {{listing.phone}}
చిరునామా: {{listing.address}}
వెబ్సైట్: {{listing.url}}","కాల్ చేయండి;మ్యాప్","PAYLOAD_CALL;PAYLOAD_MAP","","","","",list_apollo_pharmacy,draft,welcome_menu
Directory Menu,keyword,"menu, మెనూ","చౌటుప్పల్ ప్రధాన విభాగాలు:","ప్రభుత్వ సేవలు;ఆస్పత్రులు;రియల్ ఎస్టేట్;రవాణా సేవలు;హోటళ్ళు","","","","","","",draft,welcome_menu
"",keyword,"test","Empty Name Row","","","","","","","",draft,""
`

const { flows, errors } = parseFlowCsvContent(testCsv, { defaultStatus: 'draft' })

// 1. Errors check
if (errors.length !== 1 || !errors[0].message.includes('Missing flow name')) {
  console.error('Error reporting failure:', errors)
  process.exit(1)
}

// 2. English custom flow check
const engFlow = flows.find(f => f.id === 'flow_english_welcome')
if (!engFlow || !engFlow.initial_message.includes('"Your reliable community partner."')) {
  console.error('English quotes or text corrupted:', engFlow)
  process.exit(2)
}
if (engFlow.nodes[1].config.buttons[0].payload !== 'PAYLOAD_SERVICES') {
  console.error('Button payload not parsed:', engFlow.nodes[1].config.buttons)
  process.exit(3)
}
if (engFlow.nodes[1].config.buttons[0].nextNodeId !== 'action_services') {
  console.error('Next node ID not parsed:', engFlow.nodes[1].config.buttons)
  process.exit(4)
}

// 3. Telugu Video check
const telFlow = flows.find(f => f.id === 'flow_telugu_video_tour')
if (!telFlow || !telFlow.initial_message.includes('నమస్కారం! చౌటుప్పల్ పట్టణ పర్యటన వీడియో ఇక్కడ చూడండి')) {
  console.error('Telugu Unicode corrupted:', telFlow)
  process.exit(5)
}
if (telFlow.nodes[1].config.mediaType !== 'video' || telFlow.nodes[1].config.mediaUrl !== 'https://example.com/choutuppal_tour.mp4') {
  console.error('Video media not parsed:', telFlow.nodes[1].config)
  process.exit(6)
}

// 4. Pharmacy Listing check
const pharmFlow = flows.find(f => f.id === 'flow_pharmacy_finder')
if (!pharmFlow || pharmFlow.nodes[1].config.listingId !== 'list_apollo_pharmacy') {
  console.error('Listing ID not parsed:', pharmFlow?.nodes[1]?.config)
  process.exit(7)
}

// 5. List sections (>3 buttons) check
const menuFlow = flows.find(f => f.id === 'flow_directory_menu')
if (!menuFlow || menuFlow.nodes[1].type !== 'send_list' || !menuFlow.nodes[1].config.listSections) {
  console.error('List section not generated for >3 options:', menuFlow?.nodes[1])
  process.exit(8)
}

// 6. Runtime evaluation of custom Telugu & English without template clobbering
const mockListings = [
  {
    id: 'list_apollo_pharmacy',
    slug: 'apollo-pharmacy-choutuppal',
    title: 'Apollo Pharmacy Choutuppal',
    categoryName: 'Health & Medical',
    phone: '9848011111',
    address: 'NH-65 Main Road, Choutuppal',
    coverImage: 'https://images.unsplash.com/apollo.jpg',
    status: 'APPROVED',
    territoryId: 'territory_choutuppal'
  }
]

const evalResult = evaluateFlow({
  incomingText: 'మందులు',
  senderPhone: '919848099887',
  senderName: 'రమేష్',
  territory: FLAGSHIP_CHOUTUPPAL_TERRITORY,
  storeFlows: flows,
  storeListings: mockListings,
  allowDraft: true
})

if (!evalResult.matched || evalResult.flowId !== 'flow_pharmacy_finder') {
  console.error('Runtime evaluation failed:', evalResult)
  process.exit(9)
}
if (!evalResult.renderedBody.includes('Apollo Pharmacy Choutuppal') || !evalResult.renderedBody.includes('9848011111')) {
  console.error('Runtime body did not interpolate listing:', evalResult.renderedBody)
  process.exit(10)
}
if (evalResult.renderedBody.includes('welcome_menu')) {
  console.error('Legacy template hijacked message body:', evalResult.renderedBody)
  process.exit(11)
}

console.log('STEP_2_CSV_FIXTURE_OK')
"""
    code_rc, out, err = run_node_ts(code)
    print("STDOUT:", out.strip())
    if code_rc != 0:
        print("STDERR:", err)
    assert code_rc == 0, f"Step 2 CSV Fixture test failed with code {code_rc}"
    assert "STEP_2_CSV_FIXTURE_OK" in out
    print("✓ Test 3 Passed: Multi-feature CSV fixture (Telugu, quotes, buttons, lists, video, listing) verified.\n")

def test_api_crm_flows():
    print("=== Test 4: API Route /api/crm/flows (GET, DryRun, Single CRUD, Status Toggle) ===")
    code = """
import { GET, POST, PUT, DELETE } from './src/app/api/crm/flows/route.ts'
import { loadStore } from './src/lib/store.ts'
import { createSignedSessionToken } from './src/lib/auth-server.ts'

const adminToken = createSignedSessionToken({
  userId: 'usr_super',
  phone: '9441348175',
  role: 'SUPER_ADMIN',
  territoryId: 'territory_choutuppal'
})
const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${adminToken}`
}

// 1. GET
const getRes = await GET(new Request('http://localhost/api/crm/flows', {
  headers: authHeaders
}))
const getData = await getRes.json()
if (!getData.success || !Array.isArray(getData.flows) || !Array.isArray(getData.listings)) {
  console.error('GET /api/crm/flows failed:', getData)
  process.exit(1)
}

// 2. POST with dryRun: true (must not mutate store)
const storeBefore = loadStore()
const flowsCountBefore = storeBefore.flows.length

const dryRunRes = await POST(new Request('http://localhost/api/crm/flows', {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({
    dryRun: true,
    flows: [
      { id: 'flow_dry_test', name: 'Dry Run Flow', initial_message: 'Testing dry run' }
    ]
  })
}))
const dryData = await dryRunRes.json()
const storeAfterDry = loadStore()
if (!dryData.success || !dryData.dryRun || storeAfterDry.flows.length !== flowsCountBefore) {
  console.error('POST /api/crm/flows dryRun failed or mutated store:', dryData)
  process.exit(2)
}

// 3. POST single custom flow
const createRes = await POST(new Request('http://localhost/api/crm/flows', {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({
    id: 'flow_test_unit_1',
    name: 'Unit Test Flow',
    status: 'draft',
    triggerKeyword: 'UNITTEST',
    initial_message: 'Hello Unit Test',
    actionButtons: [
      { id: 'btn_u1', title: 'Unit Option 1', action: 'BUTTON_REPLY' }
    ]
  })
}))
const createData = await createRes.json()
if (!createData.success || createData.flow.id !== 'flow_test_unit_1') {
  console.error('POST /api/crm/flows creation failed:', createData)
  process.exit(3)
}

// 4. PUT toggle status to published
const putRes = await PUT(new Request('http://localhost/api/crm/flows', {
  method: 'PUT',
  headers: authHeaders,
  body: JSON.stringify({
    id: 'flow_test_unit_1',
    status: 'published'
  })
}))
const putData = await putRes.json()
if (!putData.success || putData.flow.status !== 'published' || !putData.flow.isActive) {
  console.error('PUT /api/crm/flows status toggle failed:', putData)
  process.exit(4)
}

// 5. DELETE cleanup custom flow
const delRes = await DELETE(new Request('http://localhost/api/crm/flows?id=flow_test_unit_1', {
  method: 'DELETE',
  headers: authHeaders
}))
const delData = await delRes.json()
if (!delData.success) {
  console.error('DELETE /api/crm/flows failed:', delData)
  process.exit(5)
}

console.log('API_CRM_FLOWS_OK')
"""
    code_rc, out, err = run_node_ts(code)
    print("STDOUT:", out.strip())
    if code_rc != 0:
        print("STDERR:", err)
    assert code_rc == 0, f"API test failed with code {code_rc}"
    assert "API_CRM_FLOWS_OK" in out
    print("✓ Test 4 Passed: /api/crm/flows GET, dryRun, CRUD, toggle, and DELETE verified.\n")

def test_flow_runtime_engine():
    print("=== Test 5: Flow Runtime Evaluator (Draft suppression, Keyword matching, Variables) ===")
    code = r"""
import { evaluateFlow } from './src/lib/flow-runtime-engine.ts'
import { FLAGSHIP_CHOUTUPPAL_TERRITORY } from './src/lib/store.ts'

const mockListings = [
  {
    id: 'list_apollo_pharmacy',
    slug: 'apollo-pharmacy-choutuppal',
    title: 'Apollo Pharmacy Choutuppal',
    categoryName: 'Health & Medical',
    categoryId: 'health-medical',
    phone: '9848011111',
    whatsapp: '9848011111',
    address: 'NH-65 Main Road, Choutuppal',
    coverImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800',
    status: 'APPROVED',
    territoryId: 'territory_choutuppal',
    views: 10,
    clicks: 5,
    whatsappClicks: 2,
    gallery: [],
    isFeatured: false,
    isPremium: false,
    syncedToCrm: true,
    description: '24/7 Pharmacy and emergency medicines in Choutuppal',
    villageId: 'vil_choutuppal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

const mockFlows = [
  // 1. Draft Flow (must be suppressed!)
  {
    id: 'flow_draft_secret',
    name: 'Draft Secret Flow',
    status: 'draft',
    isActive: false,
    version: 1,
    triggers: [{ type: 'keyword', value: 'secret' }],
    nodes: [
      {
        id: 'entry_message',
        type: 'send_message',
        config: { text: 'You found the secret!' }
      }
    ],
    initial_message: 'You found the secret!',
    createdAt: new Date().toISOString()
  },
  // 2. Published Flow with Variables & Buttons
  {
    id: 'flow_welcome_test',
    name: 'Welcome Live Flow',
    status: 'published',
    isActive: true,
    version: 1,
    triggers: [{ type: 'keyword', value: 'నమస్కారం' }, { type: 'keyword', value: 'hi' }],
    button_options: ['ప్రభుత్వ సేవలు', 'వ్యాపారాలు'],
    nodes: [
      {
        id: 'start',
        type: 'start',
        config: { nextNodeId: 'entry_message' }
      },
      {
        id: 'entry_message',
        type: 'send_buttons',
        config: {
          text: 'నమస్కారం {{contact.name}} గారు! {{town.name}} యాప్ కి స్వాగతం. వెబ్సైట్: {{town.url}}',
          buttons: [
            { id: 'btn_govt', title: 'ప్రభుత్వ సేవలు', action: 'BUTTON_REPLY', nextNodeId: 'node_govt' },
            { id: 'btn_biz', title: 'వ్యాపారాలు', action: 'BUTTON_REPLY', nextNodeId: 'node_biz' }
          ]
        }
      },
      {
        id: 'node_govt',
        type: 'send_message',
        config: {
          text: 'ప్రభుత్వ సేవలు విభాగం ఎంచుకున్నారు.',
          nextNodeId: 'end_terminal'
        }
      }
    ],
    initial_message: 'నమస్కారం {{contact.name}} గారు! {{town.name}} యాప్ కి స్వాగతం.',
    createdAt: new Date().toISOString()
  },
  // 3. Published Listing Flow
  {
    id: 'flow_pharmacy',
    name: 'Pharmacy Finder',
    status: 'published',
    isActive: true,
    version: 1,
    triggers: [{ type: 'keyword', value: 'pharmacy' }, { type: 'keyword', value: 'మందులు' }],
    nodes: [
      {
        id: 'entry_message',
        type: 'send_listing',
        config: {
          listingId: 'list_apollo_pharmacy',
          text: '🏥 *{{listing.title}}*\nఫోన్: {{listing.phone}}\nచిరునామా: {{listing.address}}\nలింక్: {{listing.url}}'
        }
      }
    ],
    createdAt: new Date().toISOString()
  }
]

// Test A: Draft flow suppression
const draftRes = evaluateFlow({
  incomingText: 'secret',
  senderPhone: '9848099999',
  senderName: 'Test Citizen',
  territory: FLAGSHIP_CHOUTUPPAL_TERRITORY,
  storeFlows: mockFlows,
  storeListings: mockListings
})
if (draftRes.matched) {
  console.error('FAILURE: Draft flow was incorrectly executed!', draftRes)
  process.exit(1)
}

// Test B: Published flow keyword match with variable interpolation
const pubRes = evaluateFlow({
  incomingText: 'నమస్కారం',
  senderPhone: '9848099999',
  senderName: 'రాము',
  territory: FLAGSHIP_CHOUTUPPAL_TERRITORY,
  storeFlows: mockFlows,
  storeListings: mockListings
})
if (!pubRes.matched || pubRes.flowId !== 'flow_welcome_test') {
  console.error('FAILURE: Published flow did not match "నమస్కారం"', pubRes)
  process.exit(2)
}
if (!pubRes.messageText.includes('రాము గారు') || !pubRes.messageText.includes('Choutuppal') || !pubRes.messageText.includes('https://choutuppal.in')) {
  console.error('FAILURE: Variables not properly interpolated in message:', pubRes.messageText)
  process.exit(3)
}
if (!pubRes.buttons || pubRes.buttons.length !== 2) {
  console.error('FAILURE: Interactive buttons missing in evaluation result:', pubRes.buttons)
  process.exit(4)
}

// Test C: Interactive Button reply transition
const btnRes = evaluateFlow({
  incomingText: 'ప్రభుత్వ సేవలు',
  senderPhone: '9848099999',
  senderName: 'రాము',
  territory: FLAGSHIP_CHOUTUPPAL_TERRITORY,
  storeFlows: mockFlows,
  storeListings: mockListings,
  buttonPayload: 'btn_govt',
  buttonTitle: 'ప్రభుత్వ సేవలు',
  activeFlowId: 'flow_welcome_test'
})
if (!btnRes.matched || btnRes.nodeId !== 'node_govt') {
  console.error('FAILURE: Button transition to node_govt failed:', btnRes)
  process.exit(5)
}

// Test D: Listing binding & interpolation
const listRes = evaluateFlow({
  incomingText: 'pharmacy',
  senderPhone: '9848099999',
  senderName: 'రాము',
  territory: FLAGSHIP_CHOUTUPPAL_TERRITORY,
  storeFlows: mockFlows,
  storeListings: mockListings
})
if (!listRes.matched || !listRes.messageText.includes('Apollo Pharmacy Choutuppal') || !listRes.messageText.includes('9848011111')) {
  console.error('FAILURE: Listing variables not interpolated:', listRes)
  process.exit(6)
}
if (listRes.imageUrl !== 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800') {
  console.error('FAILURE: Listing coverImage not resolved as mediaUrl:', listRes.imageUrl)
  process.exit(7)
}

console.log('EVALUATOR_OK')
"""
    code_rc, out, err = run_node_ts(code)
    print("STDOUT:", out.strip())
    if code_rc != 0:
        print("STDERR:", err)
    assert code_rc == 0, f"Evaluator test failed with code {code_rc}"
    assert "EVALUATOR_OK" in out
    print("✓ Test 5 Passed: Draft suppression, keyword match, variable interpolation, button transitions, and listing binding verified.\n")

def test_webhook_runtime_execution():
    print("=== Test 6: Inbound WhatsApp Webhook Runtime Integration ===")
    code = r"""
import { POST } from './src/app/api/whatsapp/webhook/route.ts'
import { loadStore, saveStore } from './src/lib/store.ts'

const store = loadStore()

// Install a test published flow into store temporarily
const testFlowId = 'flow_webhook_runtime_test'
const testFlow = {
  id: testFlowId,
  name: 'Webhook Runtime Flow',
  status: 'published',
  isActive: true,
  version: 1,
  triggers: [{ type: 'keyword', value: 'flowtest7' }],
  nodes: [
    {
      id: 'entry_message',
      type: 'send_buttons',
      config: {
        text: 'ధన్యవాదాలు! FlowTest7 triggered successfully for {{contact.name}}.',
        buttons: [{ id: 'btn_next_7', title: 'Next Step 7' }]
      }
    }
  ],
  initial_message: 'FlowTest7 triggered successfully.',
  button_options: ['Next Step 7'],
  createdAt: new Date().toISOString()
}

// Add flow
store.flows.unshift(testFlow)
saveStore(store)

try {
  // Simulate inbound WhatsApp webhook POST
  const webhookPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              contacts: [{ profile: { name: 'Srinivas Rao' } }],
              messages: [
                {
                  from: '919848099887',
                  id: 'wamid.HBgM' + Date.now(),
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: 'text',
                  text: { body: 'flowtest7' }
                }
              ]
            }
          }
        ]
      }
    ]
  }

  const req = new Request('http://localhost/api/whatsapp/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload)
  })

  const res = await POST(req)
  const data = await res.json()

  if (data.status !== 'flow_executed' || data.flowId !== testFlowId) {
    console.error('Webhook did not execute published flow:', data)
    process.exit(1)
  }

  // Check store.messages for honest logging
  const updatedStore = loadStore()
  const loggedMsg = updatedStore.messages.find(m => m.direction === 'outbound' && m.messageText.includes('FlowTest7 triggered'))
  if (!loggedMsg) {
    console.error('Outbound flow message was not logged in store.messages')
    process.exit(2)
  }

  if (loggedMsg.status !== 'sent') {
    console.error('Outbound message status was not honest "sent":', loggedMsg.status)
    process.exit(3)
  }

  console.log('WEBHOOK_FLOW_OK')
} finally {
  // Cleanup test flow
  const cleanupStore = loadStore()
  cleanupStore.flows = cleanupStore.flows.filter(f => f.id !== testFlowId)
  cleanupStore.messages = cleanupStore.messages.filter(m => !m.messageText?.includes('FlowTest7'))
  saveStore(cleanupStore)
}
"""
    code_rc, out, err = run_node_ts(code)
    print("STDOUT:", out.strip())
    if code_rc != 0:
        print("STDERR:", err)
    assert code_rc == 0, f"Webhook runtime test failed with code {code_rc}"
    assert "WEBHOOK_FLOW_OK" in out
    print("✓ Test 6 Passed: Webhook successfully executed published flow with honest logging.\n")

def test_flow_dry_run_route():
    print("=== Test 7: Flow Dry-Run Route (/api/crm/flows/dry-run) ===")
    code = r"""
import { POST } from './src/app/api/crm/flows/dry-run/route.ts'
import { createSignedSessionToken } from './src/lib/auth-server.ts'
import { sendWhatsAppFlowMessage } from './src/lib/whatsapp-cloud-api.ts'
import { loadStore } from './src/lib/store.ts'

const store = loadStore()

// 1. Super Admin Token
const superToken = createSignedSessionToken({
  userId: 'usr_super',
  phone: '9441348175',
  role: 'SUPER_ADMIN',
  territoryId: 'territory_choutuppal'
})

// 2. Nalgonda Admin Token
const nalgondaToken = createSignedSessionToken({
  userId: 'usr_nalgonda',
  phone: '9848022222',
  role: 'FRANCHISE_ADMIN',
  territoryId: 'territory_nalgonda'
})

// Subtest 6A: Custom Telugu candidate flow with video media & variable interpolation
const candidateFlow = {
  id: 'flow_custom_video_demo',
  name: 'Video Demo Flow',
  status: 'draft',
  isActive: true,
  version: 1,
  triggers: [{ type: 'keyword', value: 'videodemo' }],
  nodes: [
    {
      id: 'entry_message',
      type: 'send_media',
      config: {
        text: 'నమస్కారం {{contact.name}} గారు! చౌటుప్పల్ వీడియో టూర్ చూడండి: {{town.url}}',
        mediaUrl: 'https://example.com/choutuppal_tour.mp4',
        mediaType: 'video',
        buttons: [{ id: 'btn_book', title: 'బుక్ చేయండి' }]
      }
    }
  ],
  initial_message: 'Video Tour',
  createdAt: new Date().toISOString()
}

const reqA = new Request('http://localhost/api/crm/flows/dry-run', {
  method: 'POST',
  headers: {
    'authorization': 'Bearer ' + superToken,
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    messageText: 'videodemo',
    contactName: 'వెంకట్',
    candidateFlows: [candidateFlow],
    allowDraft: true
  })
})

const resA = await POST(reqA)
const dataA = await resA.json()

if (!dataA.matched || dataA.flowId !== 'flow_custom_video_demo') {
  console.error('Subtest 6A failed:', dataA)
  process.exit(1)
}
if (!dataA.renderedBody.includes('వెంకట్ గారు') || !dataA.renderedBody.includes('https://choutuppal.in')) {
  console.error('Subtest 6A variables failed:', dataA.renderedBody)
  process.exit(2)
}
if (dataA.mediaType !== 'video' || dataA.selectedMedia !== 'https://example.com/choutuppal_tour.mp4') {
  console.error('Subtest 6A video media failed:', dataA)
  process.exit(3)
}

// Subtest 6B: Directory Listing Resolution & Binding
const listing = store.listings[0]
const candidateListingFlow = {
  id: 'flow_candidate_listing_test',
  name: 'Listing Candidate Flow',
  status: 'draft',
  isActive: true,
  version: 1,
  triggers: [{ type: 'keyword', value: 'findhospital' }],
  nodes: [
    {
      id: 'entry_message',
      type: 'send_listing',
      config: {
        listingId: listing.id,
        text: 'హాస్పిటల్ వివరాలు: {{listing.title}} | ఫోన్: {{listing.phone}} | వెబ్సైట్: {{listing.url}}'
      }
    }
  ],
  initial_message: 'Hospital details',
  createdAt: new Date().toISOString()
}

const reqB = new Request('http://localhost/api/crm/flows/dry-run', {
  method: 'POST',
  headers: {
    'authorization': 'Bearer ' + superToken,
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    messageText: 'findhospital',
    candidateFlows: [candidateListingFlow],
    allowDraft: true
  })
})

const resB = await POST(reqB)
const dataB = await resB.json()

if (!dataB.matched || !dataB.attachedListing || dataB.attachedListing.id !== listing.id) {
  console.error('Subtest 6B attachedListing failed:', dataB)
  process.exit(4)
}
if (!dataB.renderedBody.includes(listing.title)) {
  console.error('Subtest 6B body listing interpolation failed:', dataB.renderedBody)
  process.exit(5)
}

// Subtest 6C: Tenant territory security isolation (cross-territory 403)
const reqCross = new Request('http://localhost/api/crm/flows/dry-run', {
  method: 'POST',
  headers: {
    'authorization': 'Bearer ' + nalgondaToken,
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    messageText: 'hi',
    territoryId: 'territory_choutuppal'
  })
})

const resCross = await POST(reqCross)
if (resCross.status !== 403) {
  console.error('Subtest 6C cross-territory check failed, status was:', resCross.status)
  process.exit(6)
}

// Subtest 6D: Honest provider delivery status verification (no false delivery)
const dispatchResult = await sendWhatsAppFlowMessage({
  toPhone: '919441348175',
  contactName: 'Test Sandbox User',
  messageText: 'Sandbox verification message',
  territoryId: 'territory_choutuppal'
}, store)

if (dispatchResult.providerDelivered !== false) {
  console.error('Subtest 6D delivery status was falsely claimed as delivered:', dispatchResult)
  process.exit(7)
}
if (!dispatchResult.notice.includes('Saved locally in CRM inbox')) {
  console.error('Subtest 6D notice missing local save message:', dispatchResult)
  process.exit(8)
}

console.log('FLOW_DRY_RUN_OK')
"""
    code_rc, out, err = run_node_ts(code)
    print("STDOUT:", out.strip())
    if code_rc != 0:
        print("STDERR:", err)
    assert code_rc == 0, f"Flow dry-run route test failed with code {code_rc}"
    assert "FLOW_DRY_RUN_OK" in out
    print("✓ Test 7 Passed: Flow dry-run route, video media, listing binding, territory isolation, and honest delivery verified.\n")

def test_runtime_media_and_payload_behavior():
    print("=== Test 8: Runtime Media and WhatsApp Payload Compliance ===")
    code = r"""
import { buildWhatsAppPayload } from './src/lib/whatsapp-cloud-api.ts'

// 1. Plain text payload
const textPayload = buildWhatsAppPayload({
  toPhone: '919441348175',
  messageText: 'Hello Choutuppal'
}, '919441348175')
if (textPayload.type !== 'text' || textPayload.text.body !== 'Hello Choutuppal') {
  console.error('Plain text payload failed:', textPayload)
  process.exit(1)
}

// 2. Image media payload with valid HTTPS URL
const imagePayload = buildWhatsAppPayload({
  toPhone: '919441348175',
  messageText: 'Check this image',
  imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae',
  mediaType: 'image'
}, '919441348175')
if (imagePayload.type !== 'image' || !imagePayload.image.url.startsWith('https://') || imagePayload.image.caption !== 'Check this image') {
  console.error('Image media payload failed:', imagePayload)
  process.exit(2)
}

// 3. Video media payload with valid HTTPS URL
const videoPayload = buildWhatsAppPayload({
  toPhone: '919441348175',
  messageText: 'Choutuppal Video Tour',
  mediaUrl: 'https://example.com/tour.mp4',
  mediaType: 'video'
}, '919441348175')
if (videoPayload.type !== 'video' || videoPayload.video.url !== 'https://example.com/tour.mp4' || videoPayload.video.caption !== 'Choutuppal Video Tour') {
  console.error('Video media payload failed:', videoPayload)
  process.exit(3)
}

// 4. Non-HTTPS / invalid URL fallback (graceful degradation to type: 'text' to prevent Meta rejection)
const invalidMediaPayload = buildWhatsAppPayload({
  toPhone: '919441348175',
  messageText: 'Fallback text without broken image',
  imageUrl: '/local/path/image.png'
}, '919441348175')
if (invalidMediaPayload.type !== 'text' || invalidMediaPayload.text.body !== 'Fallback text without broken image') {
  console.error('Invalid media URL fallback to text failed:', invalidMediaPayload)
  process.exit(4)
}

// 5. Interactive Button payload (max 3 buttons, 20-char title truncation, header image)
const buttonPayload = buildWhatsAppPayload({
  toPhone: '919441348175',
  messageText: 'Select an option',
  imageUrl: 'https://images.unsplash.com/header.jpg',
  buttons: [
    { id: 'btn_1', title: 'Option One Short' },
    { id: 'btn_2', title: 'Option Two Very Long Title That Exceeds Limit' },
    { id: 'btn_3', title: 'Option Three' },
    { id: 'btn_4', title: 'Option Four Excluded' }
  ],
  footerText: 'Powered by Choutuppal App'
}, '919441348175')
if (buttonPayload.type !== 'interactive' || buttonPayload.interactive.type !== 'button') {
  console.error('Interactive button payload type failed:', buttonPayload)
  process.exit(5)
}
if (buttonPayload.interactive.action.buttons.length !== 3) {
  console.error('Interactive buttons not capped at 3:', buttonPayload.interactive.action.buttons)
  process.exit(6)
}
if (buttonPayload.interactive.action.buttons[1].reply.title.length > 20) {
  console.error('Interactive button title exceeds 20 characters:', buttonPayload.interactive.action.buttons[1])
  process.exit(7)
}
if (!buttonPayload.interactive.header || buttonPayload.interactive.header.type !== 'image') {
  console.error('Interactive header image failed:', buttonPayload.interactive.header)
  process.exit(8)
}

// 6. Interactive List payload (sections, rows truncated to 24 chars, description to 72 chars, button to 20 chars)
const listPayload = buildWhatsAppPayload({
  toPhone: '919441348175',
  messageText: 'Choose from our directory categories',
  listButtonText: 'Browse Categories Menu',
  listSections: [
    {
      title: 'Health & Medical Services',
      rows: [
        { id: 'row_1', title: 'Apollo Pharmacy Main Road Choutuppal', description: '24/7 emergency medicines and prescription pickup service' },
        { id: 'row_2', title: 'Government Hospital Choutuppal', description: 'Outpatient consultations and round-the-clock emergency casualty care' }
      ]
    }
  ],
  footerText: 'Choutuppal Directory'
}, '919441348175')
if (listPayload.type !== 'interactive' || listPayload.interactive.type !== 'list') {
  console.error('Interactive list payload type failed:', listPayload)
  process.exit(9)
}
if (listPayload.interactive.action.button.length > 20) {
  console.error('Interactive list button text exceeds 20 chars:', listPayload.interactive.action.button)
  process.exit(10)
}
if (listPayload.interactive.action.sections[0].title.length > 24) {
  console.error('Interactive list section title exceeds 24 chars:', listPayload.interactive.action.sections[0].title)
  process.exit(11)
}
if (listPayload.interactive.action.sections[0].rows[0].title.length > 24) {
  console.error('Interactive list row title exceeds 24 chars:', listPayload.interactive.action.sections[0].rows[0].title)
  process.exit(12)
}
if (listPayload.interactive.action.sections[0].rows[0].description.length > 72) {
  console.error('Interactive list row description exceeds 72 chars:', listPayload.interactive.action.sections[0].rows[0].description)
  process.exit(13)
}

console.log('RUNTIME_MEDIA_PAYLOAD_OK')
"""
    code_rc, out, err = run_node_ts(code)
    print("STDOUT:", out.strip())
    if code_rc != 0:
        print("STDERR:", err)
    assert code_rc == 0, f"Runtime media and payload test failed with code {code_rc}"
    assert "RUNTIME_MEDIA_PAYLOAD_OK" in out
    print("✓ Test 8 Passed: WhatsApp Cloud API payloads verified across all 6 media permutations.\n")

def test_final_baseline_verification():
    print("=== Test 9: Final Baseline Counts & State Integrity ===")
    with open(DATA_FILE, 'r') as f:
        data = json.load(f)

    assert len(data.get('listings', [])) == 212, f"Listings altered: {len(data['listings'])}"
    assert len(data.get('contacts', [])) == 211, f"Contacts altered: {len(data['contacts'])}"
    assert len(data.get('deals', [])) == 4, f"Deals altered: {len(data['deals'])}"
    assert len(data.get('automations', [])) == 179, f"Automations altered: {len(data['automations'])}"
    assert len(data.get('territories', [])) == 4, f"Territories altered: {len(data['territories'])}"
    assert len(data.get('flows', [])) >= 1, f"Baseline flows missing: {len(data['flows'])}"

    # Check that all 179 automations remain draft/inactive
    for auto in data['automations']:
        status = auto.get('status')
        assert status in ('draft', 'paused', 'disabled'), f"Automation {auto.get('id')} was unexpectedly activated: {status}"

    print("✓ Test 9 Passed: Final baseline is 100% intact. All 179 automations remain draft/inactive.\n")

if __name__ == '__main__':
    print("Starting Phase 7 Flow Automation Test Suite...\n")
    test_baseline_preservation()
    test_csv_parser_39_flows()
    test_step2_csv_fixture_end_to_end()
    test_api_crm_flows()
    test_flow_runtime_engine()
    test_webhook_runtime_execution()
    test_flow_dry_run_route()
    test_runtime_media_and_payload_behavior()
    test_final_baseline_verification()
    print("==================================================")
    print("ALL PHASE 7 FLOW AUTOMATION TESTS PASSED (9/9)!")
    print("==================================================")
    shutil.rmtree(TEMP_DATA_DIR, ignore_errors=True)
