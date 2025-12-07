import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DrainerRegistry } from "../target/types/drainer_registry";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("drainer-registry", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DrainerRegistry as Program<DrainerRegistry>;

  // Test accounts
  const reporter = provider.wallet as anchor.Wallet;
  const programAuthority = anchor.web3.Keypair.generate();

  // Anti-spam fee constant (0.01 SOL)
  const ANTI_SPAM_FEE = 0.01 * LAMPORTS_PER_SOL;

  // Helper function to derive PDA
  function getDrainerReportPDA(drainerAddress: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("drainer"), drainerAddress.toBuffer()],
      program.programId
    );
  }

  // Helper function to get account balance
  async function getBalance(pubkey: PublicKey): Promise<number> {
    return await provider.connection.getBalance(pubkey);
  }

  describe("ANCHOR-003: Core Tests", () => {

    it("Test 1: Creates first report (initializes PDA)", async () => {
      // Generate a fake drainer address
      const drainerAddress = anchor.web3.Keypair.generate().publicKey;
      const [drainerReportPDA] = getDrainerReportPDA(drainerAddress);

      // Get initial balances
      const reporterBalanceBefore = await getBalance(reporter.publicKey);
      const authorityBalanceBefore = await getBalance(programAuthority.publicKey);

      // Submit first report
      const amountStolen = new anchor.BN(5 * LAMPORTS_PER_SOL); // 5 SOL stolen

      const tx = await program.methods
        .reportDrainer(drainerAddress, amountStolen)
        .accounts({
          drainerReport: drainerReportPDA,
          reporter: reporter.publicKey,
          programAuthority: programAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("First report transaction:", tx);

      // Fetch the created account
      const drainerReport = await program.account.drainerReport.fetch(drainerReportPDA);

      // Verify account data
      expect(drainerReport.drainerAddress.toString()).to.equal(drainerAddress.toString());
      expect(drainerReport.reportCount).to.equal(1);
      expect(drainerReport.totalSolReported.toNumber()).to.equal(amountStolen.toNumber());
      expect(drainerReport.recentReporters[0].toString()).to.equal(reporter.publicKey.toString());
      expect(drainerReport.firstSeen.toNumber()).to.be.a('number');
      expect(drainerReport.lastSeen.toNumber()).to.be.a('number');
      expect(drainerReport.lastSeen.toNumber()).to.equal(drainerReport.firstSeen.toNumber());

      // Verify anti-spam fee was transferred
      const reporterBalanceAfter = await getBalance(reporter.publicKey);
      const authorityBalanceAfter = await getBalance(programAuthority.publicKey);

      expect(authorityBalanceAfter - authorityBalanceBefore).to.equal(ANTI_SPAM_FEE);
      // Reporter balance should decrease by fee + rent + tx fee (approximately)
      expect(reporterBalanceBefore - reporterBalanceAfter).to.be.greaterThan(ANTI_SPAM_FEE);
    });

    it("Test 2: Updates existing report (increments count)", async () => {
      // Use the same drainer address from test 1
      const drainerAddress = anchor.web3.Keypair.generate().publicKey;
      const [drainerReportPDA] = getDrainerReportPDA(drainerAddress);

      // Create first report
      await program.methods
        .reportDrainer(drainerAddress, new anchor.BN(1 * LAMPORTS_PER_SOL))
        .accounts({
          drainerReport: drainerReportPDA,
          reporter: reporter.publicKey,
          programAuthority: programAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Get account state after first report
      const reportAfterFirst = await program.account.drainerReport.fetch(drainerReportPDA);
      const firstReportCount = reportAfterFirst.reportCount;
      const firstTotalSol = reportAfterFirst.totalSolReported;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Submit second report
      const secondAmount = new anchor.BN(2 * LAMPORTS_PER_SOL);
      await program.methods
        .reportDrainer(drainerAddress, secondAmount)
        .accounts({
          drainerReport: drainerReportPDA,
          reporter: reporter.publicKey,
          programAuthority: programAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Fetch updated account
      const reportAfterSecond = await program.account.drainerReport.fetch(drainerReportPDA);

      // Verify updates
      expect(reportAfterSecond.reportCount).to.equal(firstReportCount + 1);
      expect(reportAfterSecond.totalSolReported.toNumber()).to.equal(
        firstTotalSol.toNumber() + secondAmount.toNumber()
      );
      expect(reportAfterSecond.lastSeen.toNumber()).to.be.greaterThan(reportAfterSecond.firstSeen.toNumber());
      expect(reportAfterSecond.recentReporters[0].toString()).to.equal(reporter.publicKey.toString());
    });

    it("Test 3: Verifies anti-spam fee transfer", async () => {
      const drainerAddress = anchor.web3.Keypair.generate().publicKey;
      const [drainerReportPDA] = getDrainerReportPDA(drainerAddress);

      // Get balances before
      const authorityBalanceBefore = await getBalance(programAuthority.publicKey);

      // Submit report
      await program.methods
        .reportDrainer(drainerAddress, null)
        .accounts({
          drainerReport: drainerReportPDA,
          reporter: reporter.publicKey,
          programAuthority: programAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Get balances after
      const authorityBalanceAfter = await getBalance(programAuthority.publicKey);

      // Verify exact fee amount transferred
      const feeReceived = authorityBalanceAfter - authorityBalanceBefore;
      expect(feeReceived).to.equal(ANTI_SPAM_FEE);
    });

    it("Test 4: Verifies PDA derivation correctness", async () => {
      const drainerAddress = anchor.web3.Keypair.generate().publicKey;

      // Derive PDA manually
      const [expectedPDA, bump] = getDrainerReportPDA(drainerAddress);

      // Create report
      await program.methods
        .reportDrainer(drainerAddress, null)
        .accounts({
          drainerReport: expectedPDA,
          reporter: reporter.publicKey,
          programAuthority: programAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Verify the account exists at the expected address
      const account = await program.account.drainerReport.fetch(expectedPDA);
      expect(account).to.not.be.null;
      expect(account.drainerAddress.toString()).to.equal(drainerAddress.toString());

      // Verify we can derive the same PDA again
      const [derivedAgain] = getDrainerReportPDA(drainerAddress);
      expect(derivedAgain.toString()).to.equal(expectedPDA.toString());
    });

    it("Test 5: Handles error - cannot report yourself", async () => {
      const [drainerReportPDA] = getDrainerReportPDA(reporter.publicKey);

      try {
        await program.methods
          .reportDrainer(reporter.publicKey, null)
          .accounts({
            drainerReport: drainerReportPDA,
            reporter: reporter.publicKey,
            programAuthority: programAuthority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        // Should not reach here
        expect.fail("Expected error was not thrown");
      } catch (error) {
        // Verify it's the correct error
        expect(error.toString()).to.include("CannotReportSelf");
      }
    });

    it("Test 6: Handles error - cannot report system program", async () => {
      const systemProgramId = SystemProgram.programId;
      const [drainerReportPDA] = getDrainerReportPDA(systemProgramId);

      try {
        await program.methods
          .reportDrainer(systemProgramId, null)
          .accounts({
            drainerReport: drainerReportPDA,
            reporter: reporter.publicKey,
            programAuthority: programAuthority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        expect.fail("Expected error was not thrown");
      } catch (error) {
        expect(error.toString()).to.include("CannotReportSystemProgram");
      }
    });

    it("Test 7: Handles null amount_stolen gracefully", async () => {
      const drainerAddress = anchor.web3.Keypair.generate().publicKey;
      const [drainerReportPDA] = getDrainerReportPDA(drainerAddress);

      // Submit report with null amount
      await program.methods
        .reportDrainer(drainerAddress, null)
        .accounts({
          drainerReport: drainerReportPDA,
          reporter: reporter.publicKey,
          programAuthority: programAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Fetch account
      const drainerReport = await program.account.drainerReport.fetch(drainerReportPDA);

      // Verify total_sol_reported is 0
      expect(drainerReport.totalSolReported.toNumber()).to.equal(0);
    });
  });

  describe("Additional Edge Cases", () => {
    it("Handles multiple reports from same reporter", async () => {
      const drainerAddress = anchor.web3.Keypair.generate().publicKey;
      const [drainerReportPDA] = getDrainerReportPDA(drainerAddress);

      // Submit 3 reports from same reporter
      for (let i = 0; i < 3; i++) {
        await program.methods
          .reportDrainer(drainerAddress, new anchor.BN(LAMPORTS_PER_SOL))
          .accounts({
            drainerReport: drainerReportPDA,
            reporter: reporter.publicKey,
            programAuthority: programAuthority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      }

      const drainerReport = await program.account.drainerReport.fetch(drainerReportPDA);
      expect(drainerReport.reportCount).to.equal(3);
      expect(drainerReport.totalSolReported.toNumber()).to.equal(3 * LAMPORTS_PER_SOL);
    });

    it("Recent reporters array updates correctly", async () => {
      const drainerAddress = anchor.web3.Keypair.generate().publicKey;
      const [drainerReportPDA] = getDrainerReportPDA(drainerAddress);

      // First report
      await program.methods
        .reportDrainer(drainerAddress, null)
        .accounts({
          drainerReport: drainerReportPDA,
          reporter: reporter.publicKey,
          programAuthority: programAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const report = await program.account.drainerReport.fetch(drainerReportPDA);

      // Verify first reporter is in position 0
      expect(report.recentReporters[0].toString()).to.equal(reporter.publicKey.toString());
      // Position 1 should be default (all zeros)
      expect(report.recentReporters[1].toString()).to.equal(PublicKey.default.toString());
    });
  });
});
