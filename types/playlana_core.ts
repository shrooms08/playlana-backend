/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/playlana_core.json`.
 */
export type PlaylanaCore = {
  "address": "EQ2tfEf3XJbiCX7bsubCJUJLPBmkhWFiRXq7pjJQ59WV",
  "metadata": {
    "name": "playlanaCore",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createPlayerProfile",
      "discriminator": [
        74,
        49,
        165,
        71,
        60,
        87,
        254,
        50
      ],
      "accounts": [
        {
          "name": "playerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "player",
          "docs": [
            "can create profiles on behalf of users (gasless)."
          ]
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "registerCharacters",
      "discriminator": [
        101,
        49,
        37,
        190,
        231,
        188,
        169,
        175
      ],
      "accounts": [
        {
          "name": "characterRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  104,
                  97,
                  114,
                  97,
                  99,
                  116,
                  101,
                  114,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "characterNames",
          "type": {
            "vec": "string"
          }
        }
      ]
    },
    {
      "name": "submitMatchResult",
      "discriminator": [
        19,
        16,
        110,
        118,
        110,
        241,
        132,
        184
      ],
      "accounts": [
        {
          "name": "matchResult",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  116,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "config.total_matches",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchData",
          "type": {
            "defined": {
              "name": "submitMatchData"
            }
          }
        }
      ]
    },
    {
      "name": "updatePlayerStats",
      "discriminator": [
        61,
        85,
        73,
        244,
        51,
        95,
        21,
        33
      ],
      "accounts": [
        {
          "name": "playerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "player"
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "crownsEarned",
          "type": "u8"
        },
        {
          "name": "wonMatch",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updatePreferredCharacter",
      "discriminator": [
        9,
        252,
        8,
        41,
        206,
        160,
        8,
        137
      ],
      "accounts": [
        {
          "name": "playerProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "player"
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "characterIndex",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "characterRegistry",
      "discriminator": [
        136,
        195,
        148,
        217,
        62,
        103,
        41,
        207
      ]
    },
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "matchResult",
      "discriminator": [
        234,
        166,
        33,
        250,
        153,
        92,
        223,
        196
      ]
    },
    {
      "name": "playerProfile",
      "discriminator": [
        82,
        226,
        99,
        87,
        164,
        130,
        181,
        80
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "tooManyCharacters",
      "msg": "Too many characters in the registry"
    },
    {
      "code": 6001,
      "name": "characterNameTooLong",
      "msg": "Character name exceeds maximum length"
    },
    {
      "code": 6002,
      "name": "invalidCharacterIndex",
      "msg": "Invalid character index"
    },
    {
      "code": 6003,
      "name": "notEnoughPlayers",
      "msg": "Not enough players in the match"
    },
    {
      "code": 6004,
      "name": "tooManyPlayers",
      "msg": "Too many players in the match"
    },
    {
      "code": 6005,
      "name": "winnerNotInMatch",
      "msg": "Winner is not in the match player list"
    },
    {
      "code": 6006,
      "name": "unauthorized",
      "msg": "Unauthorized — only the program authority can call this"
    }
  ],
  "types": [
    {
      "name": "character",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "name",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "active",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "characterRegistry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "characterCount",
            "type": "u8"
          },
          {
            "name": "characters",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "character"
                  }
                },
                20
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "totalMatches",
            "type": "u64"
          },
          {
            "name": "totalPlayers",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "matchPlayer",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "characterIndex",
            "type": "u8"
          },
          {
            "name": "crownWins",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "matchResult",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "matchId",
            "type": "u64"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "submittedBy",
            "type": "pubkey"
          },
          {
            "name": "playerCount",
            "type": "u8"
          },
          {
            "name": "players",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "matchPlayer"
                  }
                },
                4
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "playerProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "totalCrownsEarned",
            "type": "u64"
          },
          {
            "name": "totalMatchesPlayed",
            "type": "u64"
          },
          {
            "name": "totalMatchesWon",
            "type": "u64"
          },
          {
            "name": "preferredCharacter",
            "type": "u8"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "submitMatchData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "players",
            "type": {
              "vec": {
                "defined": {
                  "name": "submitMatchPlayer"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "submitMatchPlayer",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "characterIndex",
            "type": "u8"
          },
          {
            "name": "crownWins",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
