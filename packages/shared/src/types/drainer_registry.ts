/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/drainer_registry.json`.
 */
export type DrainerRegistry = {
  "address": "BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2",
  "metadata": {
    "name": "drainerRegistry",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "reportDrainer",
      "docs": [
        "Report a drainer address to the on-chain registry",
        "",
        "This instruction creates or updates a DrainerReport PDA account.",
        "Requires a 0.01 SOL anti-spam fee."
      ],
      "discriminator": [
        85,
        75,
        117,
        179,
        126,
        35,
        99,
        201
      ],
      "accounts": [
        {
          "name": "drainerReport",
          "docs": [
            "The DrainerReport PDA account (created if first report, updated if exists)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  114,
                  97,
                  105,
                  110,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "drainerAddress"
              }
            ]
          }
        },
        {
          "name": "reporter",
          "docs": [
            "The reporter submitting this report (pays anti-spam fee)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "programAuthority",
          "docs": [
            "Program authority that receives anti-spam fees"
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "docs": [
            "Clock sysvar for timestamps"
          ],
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "drainerAddress",
          "type": "pubkey"
        },
        {
          "name": "amountStolen",
          "type": {
            "option": "u64"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "drainerReport",
      "discriminator": [
        128,
        141,
        53,
        82,
        70,
        169,
        131,
        176
      ]
    }
  ],
  "events": [
    {
      "name": "drainerReported",
      "discriminator": [
        189,
        174,
        41,
        201,
        252,
        36,
        60,
        177
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientFunds",
      "msg": "Insufficient funds for anti-spam fee (0.01 SOL required)"
    },
    {
      "code": 6001,
      "name": "invalidDrainerAddress",
      "msg": "Invalid drainer address provided"
    },
    {
      "code": 6002,
      "name": "reportCountOverflow",
      "msg": "Report count overflow - maximum reports reached"
    },
    {
      "code": 6003,
      "name": "amountOverflow",
      "msg": "Amount overflow - total reported amount too large"
    },
    {
      "code": 6004,
      "name": "cannotReportSelf",
      "msg": "Cannot report yourself as a drainer"
    },
    {
      "code": 6005,
      "name": "cannotReportSystemProgram",
      "msg": "Cannot report system program as drainer"
    }
  ],
  "types": [
    {
      "name": "drainerReport",
      "docs": [
        "DrainerReport account stores aggregated information about a reported drainer address"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "drainerAddress",
            "type": "pubkey"
          },
          {
            "name": "reportCount",
            "type": "u32"
          },
          {
            "name": "firstSeen",
            "type": "i64"
          },
          {
            "name": "lastSeen",
            "type": "i64"
          },
          {
            "name": "totalSolReported",
            "type": "u64"
          },
          {
            "name": "recentReporters",
            "type": {
              "array": [
                "pubkey",
                2
              ]
            }
          }
        ]
      }
    },
    {
      "name": "drainerReported",
      "docs": [
        "Event emitted when a drainer is reported"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "drainerAddress",
            "type": "pubkey"
          },
          {
            "name": "reporter",
            "type": "pubkey"
          },
          {
            "name": "reportCount",
            "type": "u32"
          },
          {
            "name": "amountStolen",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
