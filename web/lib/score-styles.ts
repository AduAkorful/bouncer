// Written by the score generator. Each door style's tempo, loop and chords, matching the audio in public/audio/score.
// A stem file is <bars> bars long plus <pad> seconds of the loop's own wrap at each end.

export const SCORE_STEMS = ["kick","perc","bass","chords","hook","arps","tick","pad"] as const;
export const SCORE_STINGERS = ["refuse", "approve", "gotin", "out", "paid"] as const;

export const SCORE_STYLES = {
  "pop": {
    "posters": "comedy",
    "bpm": 126,
    "bars": 8,
    "pad": 0.25,
    "loop": 15.238095,
    "swing": null,
    "chords": [
      [
        64,
        67,
        72,
        76
      ],
      [
        62,
        67,
        71,
        74
      ],
      [
        64,
        69,
        72,
        76
      ],
      [
        65,
        69,
        72,
        77
      ],
      [
        64,
        67,
        72,
        76
      ],
      [
        62,
        67,
        71,
        74
      ],
      [
        64,
        69,
        72,
        76
      ],
      [
        65,
        69,
        72,
        77
      ]
    ],
    "roots": [
      36,
      31,
      33,
      29,
      36,
      31,
      33,
      29
    ]
  },
  "techno": {
    "posters": "techno",
    "bpm": 130,
    "bars": 8,
    "pad": 0.25,
    "loop": 14.769231,
    "swing": null,
    "chords": [
      [
        57,
        60,
        64,
        67
      ],
      [
        57,
        60,
        64,
        67
      ],
      [
        57,
        60,
        64,
        67
      ],
      [
        57,
        60,
        64,
        67
      ],
      [
        57,
        60,
        64,
        65
      ],
      [
        57,
        60,
        64,
        65
      ],
      [
        59,
        62,
        65,
        67
      ],
      [
        59,
        62,
        65,
        67
      ]
    ],
    "roots": [
      33,
      33,
      33,
      33,
      29,
      29,
      31,
      31
    ]
  },
  "amapiano": {
    "posters": "amapiano",
    "bpm": 112,
    "bars": 8,
    "pad": 0.25,
    "loop": 17.142857,
    "swing": {
      "grid": 16,
      "amt": 0.1
    },
    "chords": [
      [
        56,
        60,
        63,
        67
      ],
      [
        56,
        60,
        63,
        67
      ],
      [
        61,
        65,
        68,
        72
      ],
      [
        61,
        65,
        68,
        72
      ],
      [
        55,
        58,
        60,
        65
      ],
      [
        55,
        58,
        60,
        65
      ],
      [
        56,
        60,
        63,
        67
      ],
      [
        55,
        60,
        63,
        67
      ]
    ],
    "roots": [
      41,
      41,
      34,
      34,
      39,
      39,
      32,
      32
    ]
  },
  "soca": {
    "posters": "carnival",
    "bpm": 128,
    "bars": 8,
    "pad": 0.25,
    "loop": 15,
    "swing": null,
    "chords": [
      [
        55,
        59,
        62,
        67
      ],
      [
        54,
        57,
        62,
        66
      ],
      [
        55,
        59,
        64,
        67
      ],
      [
        55,
        60,
        64,
        67
      ],
      [
        55,
        59,
        62,
        67
      ],
      [
        54,
        57,
        62,
        66
      ],
      [
        55,
        59,
        64,
        67
      ],
      [
        55,
        60,
        64,
        67
      ]
    ],
    "roots": [
      43,
      38,
      40,
      36,
      43,
      38,
      40,
      36
    ]
  },
  "afrobeats": {
    "posters": "accra",
    "bpm": 104,
    "bars": 8,
    "pad": 0.25,
    "loop": 18.461538,
    "swing": {
      "grid": 16,
      "amt": 0.14
    },
    "chords": [
      [
        59,
        62,
        64,
        67
      ],
      [
        60,
        64,
        67,
        71
      ],
      [
        59,
        62,
        67,
        71
      ],
      [
        57,
        62,
        66,
        69
      ],
      [
        59,
        62,
        64,
        67
      ],
      [
        60,
        64,
        67,
        71
      ],
      [
        59,
        62,
        67,
        71
      ],
      [
        57,
        62,
        66,
        69
      ]
    ],
    "roots": [
      40,
      36,
      43,
      38,
      40,
      36,
      43,
      38
    ]
  },
  "garage": {
    "posters": "london",
    "bpm": 132,
    "bars": 8,
    "pad": 0.25,
    "loop": 14.545455,
    "swing": {
      "grid": 16,
      "amt": 0.2
    },
    "chords": [
      [
        60,
        64,
        65,
        69
      ],
      [
        60,
        64,
        65,
        69
      ],
      [
        62,
        65,
        69,
        70
      ],
      [
        62,
        65,
        69,
        70
      ],
      [
        60,
        62,
        65,
        69
      ],
      [
        60,
        62,
        65,
        69
      ],
      [
        61,
        64,
        67,
        70
      ],
      [
        61,
        64,
        67,
        69
      ]
    ],
    "roots": [
      38,
      38,
      43,
      43,
      34,
      34,
      33,
      33
    ]
  },
  "jazz": {
    "posters": "jazz",
    "bpm": 92,
    "bars": 8,
    "pad": 0.25,
    "loop": 20.869565,
    "swing": {
      "grid": 8,
      "amt": 0.33
    },
    "chords": [
      [
        53,
        57,
        60,
        64
      ],
      [
        53,
        57,
        59,
        64
      ],
      [
        52,
        55,
        59,
        62
      ],
      [
        55,
        58,
        61,
        64
      ],
      [
        53,
        57,
        60,
        64
      ],
      [
        53,
        57,
        59,
        64
      ],
      [
        52,
        55,
        59,
        62
      ],
      [
        55,
        58,
        61,
        64
      ]
    ],
    "roots": [
      38,
      43,
      36,
      45,
      38,
      43,
      36,
      45
    ]
  }
} as const;
