import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { PublicKey, Transaction, Connection } from '@solana/web3.js'
import { AnchorClient } from '../../services/anchor-client'

const app = new Hono()

// Apply CORS middleware to all actions routes
// Required for Solana Blinks to work across platforms (Twitter, Discord, etc.)
app.use('/api/actions/report', cors({
  origin: '*', // Allow all origins for Blinks
  allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Content-Encoding', 'Accept-Encoding'],
  exposeHeaders: ['Content-Type', 'X-Action-Version', 'X-Blockchain-Ids'],
  credentials: false, // Blinks don't use credentials
}))

// GET /api/actions/report - Returns Solana Actions metadata for reporting drainers
// Follows Solana Actions API specification v1.0
app.get('/api/actions/report', (c) => {
  // Get base URL from request or environment
  const url = new URL(c.req.url)
  const baseUrl = process.env.API_BASE_URL || `${url.protocol}//${url.host}`
  
  // Solana Actions spec requires 'type: action' field
  return c.json({
    type: 'action', // Required by Solana Actions spec
    icon: `${baseUrl}/icon.png`, // Icon for the action card
    label: 'Report Drainer', // Button text (max 5 words, starts with verb)
    title: 'Report Known Drainer', // Max 60 characters
    description: 'Submit a drainer address to the on-chain registry to protect the community.', // Max 200 characters
    
    // Action links
    links: {
      actions: [
        {
          label: 'Report Drainer',
          href: `${baseUrl}/api/actions/report`,
          parameters: [
            {
              name: 'drainerAddress',
              label: 'Drainer Wallet Address',
              required: true,
              type: 'string',
            },
            {
              name: 'amountStolen',
              label: 'Amount Stolen (SOL)',
              required: false,
              type: 'number',
              min: 0,
            }
          ]
        }
      ]
    },
    
    // Additional metadata (optional)
    tags: ['security', 'report', 'drainer', 'community'],
    group: 'Security Tools'
  }, {
    headers: {
      'X-Action-Version': '1.0', // Solana Actions API version
      'X-Blockchain-Ids': '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9H', // Solana mainnet chain ID
    }
  })
})

// POST /api/actions/report - Handle the action and return transaction
// Follows Solana Actions API specification v1.0
app.post('/api/actions/report', async (c) => {
  try {
    const body = await c.req.json()
    const { account, data } = body

    if (!account) {
      return c.json({ 
        error: 'Account is required',
        message: 'Wallet account address is required to submit a report'
      }, { status: 400 })
    }

    // Extract drainer address from data or query params
    let drainerAddress: string
    const amountStolen = data?.amountStolen

    if (data?.drainerAddress) {
      drainerAddress = data.drainerAddress
    } else {
      // Try to get from query params as fallback
      const url = new URL(c.req.url)
      drainerAddress = url.searchParams.get('drainerAddress') || ''
    }

    if (!drainerAddress) {
      return c.json({ 
        error: 'Drainer address is required',
        message: 'Please provide the drainer wallet address to report'
      }, { status: 400 })
    }

    // Validate addresses
    let userPublicKey: PublicKey
    try {
      userPublicKey = new PublicKey(account)
      new PublicKey(drainerAddress) // Validate the drainer address too
    } catch (error) {
      return c.json({ 
        error: 'Invalid wallet address',
        message: 'The provided address is not a valid Solana address'
      }, { status: 400 })
    }

    // Prevent self-reporting
    if (account === drainerAddress) {
      return c.json({ 
        error: 'Cannot report yourself',
        message: 'You cannot report your own wallet as a drainer'
      }, { status: 400 })
    }

    // Initialize RPC connection and Anchor client
    const network = (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet' | 'devnet'
    const rpcUrl = network === 'mainnet' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com'
    const connection = new Connection(rpcUrl, 'confirmed')
    const anchorClient = new AnchorClient(connection, process.env.ANCHOR_WALLET)

    // Get recent blockhash (REQUIRED for Solana transactions)
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

    // Build the report transaction using Anchor program
    // We'll build the instruction without signing it, so the user can sign it via their wallet
    
    // Convert SOL to lamports if amount provided
    const amountStolenLamports = amountStolen 
      ? Math.floor(amountStolen * 1e9)
      : undefined

    // Build the Anchor instruction using the client's helper method
    // This creates an unsigned instruction that the user will sign
    const reportInstruction = await anchorClient.buildReportDrainerInstruction(
      drainerAddress,
      userPublicKey,
      amountStolenLamports
    )

    // Create transaction with the Anchor instruction
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: userPublicKey,
    })

    // Add the Anchor program instruction
    transaction.add(reportInstruction)
    
    // Serialize transaction (without signatures - wallet will sign)
    const serializedTransaction = transaction.serialize({ 
      requireAllSignatures: false,
      verifySignatures: false 
    }).toString('base64')

    // Return response according to Solana Actions spec
    return c.json({
      transaction: serializedTransaction,
      message: `Report submitted for drainer: ${drainerAddress.substring(0, 8)}...${drainerAddress.substring(drainerAddress.length - 8)}`,
      // Include report details in response (optional)
      report: {
        drainerAddress,
        amountStolen: amountStolen || null,
        reporter: account,
      }
    })

  } catch (error) {
    console.error('Error in report action:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return c.json({ 
      error: 'Failed to process drainer report',
      message: errorMessage
    }, { status: 500 })
  }
})

export default app

