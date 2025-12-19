import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { PublicKey, Transaction, Connection } from '@solana/web3.js'
import { analyzeWallet } from '../../services/wallet-analysis'

const app = new Hono()

// Apply CORS middleware to all actions routes
// Required for Solana Blinks to work across platforms (Twitter, Discord, etc.)
app.use('/api/actions/*', cors({
  origin: '*', // Allow all origins for Blinks
  allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Content-Encoding', 'Accept-Encoding'],
  exposeHeaders: ['Content-Type', 'X-Action-Version', 'X-Blockchain-Ids'],
  credentials: false, // Blinks don't use credentials
}))

// GET /api/actions/check - Returns Solana Actions metadata
// Follows Solana Actions API specification v1.0
app.get('/api/actions/check', (c) => {
  // Get base URL from request or environment
  const url = new URL(c.req.url)
  const baseUrl = process.env.API_BASE_URL || `${url.protocol}//${url.host}`
  
  // Solana Actions spec requires 'type: action' field
  return c.json({
    type: 'action', // Required by Solana Actions spec
    icon: `${baseUrl}/icon.png`, // Icon for the action card
    label: 'Check Wallet Security', // Button text (max 5 words, starts with verb)
    title: 'Have I Been Drained?', // Max 60 characters
    description: 'Analyze your Solana wallet for security threats, unlimited approvals, and known drainer signatures.', // Max 200 characters
    
    // Action links
    links: {
      actions: [
        {
          label: 'Check Wallet',
          href: `${baseUrl}/api/actions/check`,
          parameters: [
            {
              name: 'address',
              label: 'Wallet Address',
              required: true,
              type: 'string',
            }
          ]
        }
      ]
    },
    
    // Additional metadata (optional)
    tags: ['security', 'wallet', 'solana', 'drainer-detection'],
    group: 'Security Tools'
  }, {
    headers: {
      'X-Action-Version': '1.0', // Solana Actions API version
      'X-Blockchain-Ids': 'solana', // Solana blockchain identifier
    }
  })
})

// POST /api/actions/check - Handle the action and return transaction
// Follows Solana Actions API specification v1.0
app.post('/api/actions/check', async (c) => {
  try {
    const body = await c.req.json()
    const { account, data } = body

    if (!account) {
      return c.json({ 
        error: 'Account is required',
        message: 'Wallet account address is required to process the check'
      }, { status: 400 })
    }

    // Extract wallet address from data or account
    let walletAddress: string

    if (data?.address) {
      walletAddress = data.address
    } else {
      // If no address provided, use the account as the wallet to check
      walletAddress = account
    }

    // Validate the wallet address
    let userPublicKey: PublicKey
    try {
      userPublicKey = new PublicKey(account)
      new PublicKey(walletAddress) // Validate the wallet address too
    } catch (error) {
      return c.json({ 
        error: 'Invalid wallet address',
        message: 'The provided wallet address is not a valid Solana address'
      }, { status: 400 })
    }

    // Analyze wallet (includes demo mode check)
    const network = (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet' | 'devnet'
    
    let riskReport
    try {
      riskReport = await analyzeWallet(walletAddress, {
        limit: 20,
        network,
      })
    } catch (error: any) {
      return c.json({ 
        error: 'Failed to analyze wallet',
        message: error.message || 'Server configuration error. Please contact support.'
      }, { status: 500 })
    }

    // Initialize RPC connection for transaction creation
    const rpcUrl = network === 'mainnet' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com'
    const connection = new Connection(rpcUrl, 'confirmed')

    // Get recent blockhash (REQUIRED for Solana transactions)
    // This ensures the transaction is valid and can be processed
    let blockhash: string
    try {
      const { blockhash: recentBlockhash } = await connection.getLatestBlockhash('finalized')
      blockhash = recentBlockhash
    } catch (error) {
      console.error('Error fetching blockhash:', error)
      return c.json({ 
        error: 'Failed to fetch recent blockhash',
        message: 'Unable to create transaction. Please try again.'
      }, { status: 500 })
    }

    // Create a memo transaction that records the check
    // This is a read-only action that doesn't transfer funds, just records the check on-chain
    const memoProgramId = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
    const memoMessage = `HaveIBeenDrained Check: Risk Score ${riskReport.overallRisk}% - ${riskReport.severity}`

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: userPublicKey,
    })

    // Add memo instruction
    transaction.add({
      keys: [
        { pubkey: userPublicKey, isSigner: true, isWritable: false }
      ],
      programId: memoProgramId,
      data: Buffer.from(memoMessage)
    })

    // Serialize transaction (without signatures - wallet will sign)
    const serializedTransaction = transaction.serialize({ 
      requireAllSignatures: false,
      verifySignatures: false 
    }).toString('base64')

    // Return response according to Solana Actions spec
    return c.json({
      transaction: serializedTransaction,
      message: `Wallet security analysis complete. Risk Score: ${riskReport.overallRisk}% (${riskReport.severity})`,
      // Include risk report in response (optional, but useful for display)
      riskReport: {
        score: riskReport.overallRisk,
        severity: riskReport.severity,
        detectionsCount: riskReport.detections.length,
        recommendations: riskReport.recommendations.slice(0, 3) // Limit to 3 for blinks
      }
    }, {
      headers: {
        'X-Action-Version': '1.0', // Solana Actions API version
        'X-Blockchain-Ids': 'solana', // Solana blockchain identifier
      }
    })

  } catch (error) {
    console.error('Error in check action:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ 
      error: 'Failed to process wallet check',
      message: errorMessage
    }, { status: 500 })
  }
})

export default app
