2025-03-12T09:54:06.331 app[48e21d5f19e918] arn [info] Fel vid hämtning av användardata: {

2025-03-12T09:54:06.331 app[48e21d5f19e918] arn [info] code: 'PGRST116',

2025-03-12T09:54:06.331 app[48e21d5f19e918] arn [info] details: 'The result contains 0 rows',

2025-03-12T09:54:06.331 app[48e21d5f19e918] arn [info] hint: null,

2025-03-12T09:54:06.331 app[48e21d5f19e918] arn [info] message: 'JSON object requested, multiple (or no) rows returned'

2025-03-12T09:54:06.331 app[48e21d5f19e918] arn [info] }

2025-03-12T09:54:06.336 app[48e21d5f19e918] arn [info] Fel vid hämtning av användardata: {

2025-03-12T09:54:06.336 app[48e21d5f19e918] arn [info] code: 'PGRST116',

2025-03-12T09:54:06.336 app[48e21d5f19e918] arn [info] details: 'The result contains 0 rows',

2025-03-12T09:54:06.336 app[48e21d5f19e918] arn [info] hint: null,

2025-03-12T09:54:06.336 app[48e21d5f19e918] arn [info] message: 'JSON object requested, multiple (or no) rows returned'

2025-03-12T09:54:06.336 app[48e21d5f19e918] arn [info] }

2025-03-12T09:54:06.420 app[48e21d5f19e918] arn [info] Fel vid hämtning av användardata: {

2025-03-12T09:54:06.420 app[48e21d5f19e918] arn [info] code: 'PGRST116',

2025-03-12T09:54:06.420 app[48e21d5f19e918] arn [info] details: 'The result contains 0 rows',

2025-03-12T09:54:06.420 app[48e21d5f19e918] arn [info] hint: null,

2025-03-12T09:54:06.420 app[48e21d5f19e918] arn [info] message: 'JSON object requested, multiple (or no) rows returned'

2025-03-12T09:54:06.420 app[48e21d5f19e918] arn [info] }

2025-03-12T09:54:06.431 app[48e21d5f19e918] arn [info] Fel vid skapande av användardata: {

2025-03-12T09:54:06.431 app[48e21d5f19e918] arn [info] code: '23505',

2025-03-12T09:54:06.431 app[48e21d5f19e918] arn [info] details: 'Key (user_id)=(74d4739a-343b-462c-9ba8-d33055fa29fb) already exists.',

2025-03-12T09:54:06.431 app[48e21d5f19e918] arn [info] hint: null,

2025-03-12T09:54:06.431 app[48e21d5f19e918] arn [info] message: 'duplicate key value violates unique constraint "user_usage_user_id_key"'

2025-03-12T09:54:06.431 app[48e21d5f19e918] arn [info] }

2025-03-12T09:54:06.431 app[48e21d5f19e918] arn [info] Fel vid kontroll av användargräns: Error: Kunde inte skapa användardata

2025-03-12T09:54:06.431 app[48e21d5f19e918] arn [info] at checkUserLimit (/workspace/dist/services/supabaseService.js:103:23)

2025-03-12T09:54:06.431 app[48e21d5f19e918] arn [info] at process.processTicksAndRejections (node:internal/process/task_queues:105:5)

2025-03-12T09:54:06.431 app[48e21d5f19e918] arn [info] at async /workspace/dist/server.js:373:27

2025-03-12T09:54:06.483 app[48e21d5f19e918] arn [info] Fel vid skapande av användardata: {

2025-03-12T09:54:06.483 app[48e21d5f19e918] arn [info] code: '23505',

2025-03-12T09:54:06.484 app[48e21d5f19e918] arn [info] details: 'Key (user_id)=(74d4739a-343b-462c-9ba8-d33055fa29fb) already exists.',

2025-03-12T09:54:06.484 app[48e21d5f19e918] arn [info] hint: null,

2025-03-12T09:54:06.484 app[48e21d5f19e918] arn [info] message: 'duplicate key value violates unique constraint "user_usage_user_id_key"'

2025-03-12T09:54:06.484 app[48e21d5f19e918] arn [info] }

2025-03-12T09:54:06.484 app[48e21d5f19e918] arn [info] Fel vid kontroll av användargräns: Error: Kunde inte skapa användardata

2025-03-12T09:54:06.484 app[48e21d5f19e918] arn [info] at checkUserLimit (/workspace/dist/services/supabaseService.js:103:23)

2025-03-12T09:54:06.484 app[48e21d5f19e918] arn [info] at process.processTicksAndRejections (node:internal/process/task_queues:105:5)

2025-03-12T09:54:06.484 app[48e21d5f19e918] arn [info] at async /workspace/dist/server.js:373:27

2025-03-12T09:55:38.993 app[48e21d5f19e918] arn [info] Received analyze request

2025-03-12T09:55:38.994 app[48e21d5f19e918] arn [info] Checking usage limit for user: 74d4739a-343b-462c-9ba8-d33055fa29fb

2025-03-12T09:55:39.059 app[48e21d5f19e918] arn [info] User limit check result: {

2025-03-12T09:55:39.059 app[48e21d5f19e918] arn [info] userId: '74d4739a-343b-462c-9ba8-d33055fa29fb',

2025-03-12T09:55:39.059 app[48e21d5f19e918] arn [info] analysesUsed: 0,

2025-03-12T09:55:39.059 app[48e21d5f19e918] arn [info] analysesLimit: 2,

2025-03-12T09:55:39.059 app[48e21d5f19e918] arn [info] hasRemainingAnalyses: true,

2025-03-12T09:55:39.059 app[48e21d5f19e918] arn [info] isPremium: false

2025-03-12T09:55:39.059 app[48e21d5f19e918] arn [info] }

2025-03-12T09:55:39.059 app[48e21d5f19e918] arn [info] Processing image... { isCropped: true, hasUserId: true }

2025-03-12T09:55:39.060 app[48e21d5f19e918] arn [info] Initial image size: 1.87MB

2025-03-12T09:55:39.060 app[48e21d5f19e918] arn [info] Compressing image...

2025-03-12T09:55:39.224 app[48e21d5f19e918] arn [info] First compression size: 0.04MB

2025-03-12T09:55:39.224 app[48e21d5f19e918] arn [info] Final base64 size: 0.04MB

2025-03-12T09:55:39.224 app[48e21d5f19e918] arn [info] Compressed image size: 0.04MB

2025-03-12T09:55:39.224 app[48e21d5f19e918] arn [info] Using prompt for cropped image

2025-03-12T09:55:39.224 app[48e21d5f19e918] arn [info] Sending request to Claude...

2025-03-12T09:55:45.062 app[48e21d5f19e918] arn [info] Received response from Claude

2025-03-12T09:55:45.062 app[48e21d5f19e918] arn [info] Raw response from Claude: {

2025-03-12T09:55:45.062 app[48e21d5f19e918] arn [info] "isVegan": false,

2025-03-12T09:55:45.062 app[48e21d5f19e918] arn [info] "confidence": 0.9,

2025-03-12T09:55:45.062 app[48e21d5f19e918] arn [info] "productName": "Tacofyllning",

2025-03-12T09:55:45.062 app[48e21d5f19e918] arn [info] "ingredientList": ["köttfärs", "Santa Maria Taco Spice Mix", "vatten", "spiskummin", "vitlök", "druvsocker", "lök", "salt", "oregano", "jästextrakt", "potatisstärkelse", "potatisfiber", "klumförebyggande medel", "kryddextrakt"],

2025-03-12T09:55:45.062 app[48e21d5f19e918] arn [info] "nonVeganIngredients": ["köttfärs"],

2025-03-12T09:55:45.062 app[48e21d5f19e918] arn [info] "reasoning": "Produkten är inte vegansk eftersom den innehåller köttfärs som huvudingrediens. Övriga ingredienser är växtbaserade kryddor och tillsatser, men köttfärsen gör produkten klart icke-vegansk."

2025-03-12T09:55:45.062 app[48e21d5f19e918] arn [info] }

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] Parsed Claude result: {

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] isVegan: false,

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] confidence: 0.9,

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] productName: 'Tacofyllning',

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] ingredientList: [

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] 'köttfärs',

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] 'Santa Maria Taco Spice Mix',

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] 'vatten',

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] 'spiskummin',

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] 'vitlök',

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] 'druvsocker',

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] 'lök',

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] 'salt',

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] 'oregano',

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] 'jästextrakt',

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] 'potatisstärkelse',

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] 'potatisfiber',

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] 'klumförebyggande medel',

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] 'kryddextrakt'

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] ],

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] nonVeganIngredients: [ 'köttfärs' ],

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] reasoning: 'Produkten är inte vegansk eftersom den innehåller köttfärs som huvudingrediens. Övriga ingredienser är växtbaserade kryddor och tillsatser, men köttfärsen gör produkten klart icke-vegansk.'

2025-03-12T09:55:45.063 app[48e21d5f19e918] arn [info] }

2025-03-12T09:55:45.068 app[48e21d5f19e918] arn [info] Local validation result: {

2025-03-12T09:55:45.068 app[48e21d5f19e918] arn [info] isVegan: true,

2025-03-12T09:55:45.068 app[48e21d5f19e918] arn [info] confidence: 0.9,

2025-03-12T09:55:45.068 app[48e21d5f19e918] arn [info] nonVeganIngredients: [],

2025-03-12T09:55:45.068 app[48e21d5f19e918] arn [info] uncertainIngredients: [],

2025-03-12T09:55:45.068 app[48e21d5f19e918] arn [info] reasoning: 'Alla ingredienser bedöms som veganska.',

2025-03-12T09:55:45.068 app[48e21d5f19e918] arn [info] debug: { fuzzyMatches: [] }

2025-03-12T09:55:45.068 app[48e21d5f19e918] arn [info] }

2025-03-12T09:55:45.068 app[48e21d5f19e918] arn [info] Incrementing analysis count for user: 74d4739a-343b-462c-9ba8-d33055fa29fb

2025-03-12T09:55:45.206 app[48e21d5f19e918] arn [info] Analysis count incremented: { analysesUsed: 1, analysesLimit: 2 }

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] Sending final result: {

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] isVegan: false,

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] confidence: 0.9,

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] allIngredients: [

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'köttfärs',

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'Santa Maria Taco Spice Mix',

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'vatten',

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'spiskummin',

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'vitlök',

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'druvsocker',

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'lök',

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'salt',

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'oregano',

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'jästextrakt',

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'potatisstärkelse',

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'potatisfiber',

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'klumförebyggande medel',

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'kryddextrakt'

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] ],

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] nonVeganIngredients: [ 'köttfärs' ],

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] reasoning: 'Produkten är inte vegansk eftersom den innehåller köttfärs som huvudingrediens. Övriga ingredienser är växtbaserade kryddor och tillsatser, men köttfärsen gör produkten klart icke-vegansk.\n' +

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] '\n' +

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] 'Alla ingredienser bedöms som veganska.',

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] usageUpdated: true,

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] usageInfo: { analysesUsed: 1, analysesLimit: 2, remaining: 1 }

2025-03-12T09:55:45.207 app[48e21d5f19e918] arn [info] }