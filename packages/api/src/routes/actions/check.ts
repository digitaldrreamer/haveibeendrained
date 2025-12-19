import { Hono } from 'hono'
import { PublicKey, Transaction, SystemProgram, Connection } from '@solana/web3.js'
import { RiskAggregator } from '../../services/risk-aggregator'
import { HeliusClient } from '../../services/helius'
import { DrainerDetector } from '../../services/detector'
import { AnchorClient } from '../../services/anchor-client'

const app = new Hono()

// GET /api/actions/check - Returns Solana Actions metadata
// Follows Solana Actions API specification
app.get('/api/actions/check', (c) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001'
  
  return c.json({
    // Required fields for Solana Actions
    icon: `${baseUrl}/icon.png`, // TODO: Add icon file
    label: 'Check Wallet Security',
    title: 'Have I Been Drained?',
    description: 'Analyze your Solana wallet for security threats, unlimited approvals, and known drainer signatures.',
    
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
            }
          ]
        }
      ]
    },
    
    // Additional metadata
    tags: ['security', 'wallet', 'solana', 'drainer-detection'],
    group: 'Security Tools'
  })
})

// POST /api/actions/check - Handle the action and return transaction
app.post('/api/actions/check', async (c) => {
  try {
    const body = await c.req.json()
    const { account, data } = body

    if (!account) {
      return c.json({ error: 'Account is required' }, { status: 400 })
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
    try {
      new PublicKey(walletAddress)
    } catch (error) {
      return c.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    // Initialize Helius client
    const heliusKey = process.env.HELIUS_API_KEY
    if (!heliusKey) {
      return c.json({ error: 'HELIUS_API_KEY not configured' }, { status: 500 })
    }

    const network = (process.env.SOLANA_NETWORK || 'devnet') as 'mainnet' | 'devnet'
    const heliusClient = new HeliusClient(heliusKey, network)

    // Get recent transactions for the wallet
    const transactions = await heliusClient.getTransactionsForAddress(walletAddress, { limit: 20 })

    // Initialize Anchor client for known drainer checks
    const rpcUrl = network === 'mainnet' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com'
    const connection = new Connection(rpcUrl, 'confirmed')
    const anchorClient = new AnchorClient(connection, process.env.ANCHOR_WALLET)

    // Run real detection on transactions
    const detections = []

    for (const tx of transactions) {
      const setAuthority = DrainerDetector.detectSetAuthority(tx)
      if (setAuthority) detections.push(setAuthority)

      const unlimitedApproval = DrainerDetector.detectUnlimitedApproval(tx)
      if (unlimitedApproval) detections.push(unlimitedApproval)

      // Check against on-chain drainer registry
      const known = await DrainerDetector.detectKnownDrainer(
        tx, 
        async (addr: string) => await anchorClient.isKnownDrainer(addr)
      )
      if (known) detections.push(known)
    }

    // Aggregate risk
    const riskReport = RiskAggregator.aggregateRisk(detections, {
      walletAddress,
      transactionCount: transactions.length,
    })

    // Create a simple memo transaction that records the check
    const memoInstruction = {
      keys: [
        { pubkey: new PublicKey(account), isSigner: true, isWritable: true }
      ],
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'), // Memo program
      data: Buffer.from(`HaveIBeenDrained Check: Risk Score ${riskReport.overallRisk}% - ${riskReport.severity}`)
    }

    const transaction = new Transaction()
    transaction.add({
      keys: memoInstruction.keys,
      programId: memoInstruction.programId,
      data: memoInstruction.data
    })

    // Return the transaction for signing
    return c.json({
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      message: `Wallet security analysis complete. Risk Score: ${riskReport.overallRisk}% (${riskReport.severity})`,
      riskReport: {
        score: riskReport.overallRisk,
        severity: riskReport.severity,
        detectionsCount: riskReport.detections.length,
        recommendations: riskReport.recommendations.slice(0, 3) // Limit to 3 for blinks
      }
    })

  } catch (error) {
    console.error('Error in check action:', error)
    return c.json({ error: 'Failed to process wallet check' }, { status: 500 })
  }
})

export default app
