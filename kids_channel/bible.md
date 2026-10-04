# Sunny Hollow — Series Bible

Short story-driven learning videos for kids aged 2–6. Every video is a tiny story
with ONE clear thing to learn. English, aimed at US / UK / AU / CA.

## The world
Sunny Hollow is a cozy green valley with a winding stream, a big apple tree,
a red-roofed treehouse, a little market and a lily pond. Always bright, warm and safe.

## Characters (look must never change — use the reference sheets in `assets/characters/`)

| id | Name | Who | Personality | Catchphrase |
|----|------|-----|-------------|-------------|
| `bo` | **Bo** | small round baby elephant, sky-blue, big ears, orange scarf | curious, asks "Why?", makes the mistake the kids learn from | "Ooh, I wonder…" |
| `pip` | **Pip** | tiny fluffy yellow chick, red sneakers | energetic, loves counting everything | "Let's count!" |
| `luna` | **Luna** | lavender bunny, pink flower behind one ear, little paint-smeared apron | gentle, artsy, loves colors & shapes | "So pretty!" |
| `hoot` | **Grandpa Hoot** | old brown owl, round golden glasses, green cardigan | wise, calm, explains the lesson simply | "Let's think about it together." |
| `narrator` | Narrator | — (voice only) | warm, slow, smiling voice; talks to the child directly | — |

## Visual style (append to every image prompt — `characters.json > style`)
High-end 3D animated feature-film look, soft rounded shapes, big expressive eyes,
warm pastel palette, soft golden-hour lighting, shallow depth of field, clean
uncluttered backgrounds, no text in the image.

## Formats

### Long episode (`format: "long"`, 16:9, 2.5–4 min, 10–16 scenes)
1. **Hook (0–10 s)** — a problem or question appears. ("Oh no! Pip lost his red ball!")
2. **Try & mistake** — Bo tries something wrong; it's funny, never scary.
3. **Learning moment** — Grandpa Hoot or a friend shows the idea. The key word / number
   goes in `big_text` and is said **3 times**. Narrator invites the child:
   "Can you say it with me? …"
4. **Practice** — the friends use it again 2–3 times (count again, spot another color).
5. **Happy ending + recap** — one sentence recap, then
   "See you next time in Sunny Hollow!"

### Short (`format: "short"`, 9:16, 25–50 s, 4–6 scenes)
One beat: hook in the first 2 seconds → one learning item → a smile ending.
Shorts can be a moment from an episode or a standalone mini-story.

## Writing rules
- Sentences of max ~10 words. Simple words. Slow pace. Lots of repetition.
- Characters are always kind. Mistakes are funny, never scary, nobody gets hurt.
- No brands, no real people, no scary animals or loud jump moments, no unsafe behaviour
  shown as fun (e.g. running into the road).
- Every video teaches something real and correct (count right, colors right, facts right).
- Titles: short, clear, keyword first. e.g. "Counting to 5 with Pip | Sunny Hollow Stories for Kids".
- Each scene: max ~3 lines of dialogue. 1 scene ≈ 6–15 seconds.

## Season 1 curriculum (in order; tick off in `state.json`)
1. Counting 1 to 5 (apples)
2. Colors of the rainbow
3. Shapes: circle, square, triangle
4. Sharing is caring
5. Big and small (opposites)
6. Letter A — apple, ant, alligator
7. Weather: sunny, rainy, windy
8. Brushing teeth
9. Counting 6 to 10 (stars)
10. Feelings: happy, sad, angry, calm
11. Letter B — ball, bee, boat
12. Healthy food: fruits and vegetables
13. Day and night
14. Saying please and thank you
15. Animal sounds on the farm
16. Up and down, in and out
17. Letter C — cat, cup, car
18. Bedtime routine
19. Hot and cold
20. Helping clean up
