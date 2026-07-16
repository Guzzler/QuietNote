# M1 Baseline (in-browser) — gemma-2-2b-it-q4f32_1-MLC

Generated 2026-07-16T07:16:10.546Z.

## Echo cases (single-turn)

| id | mode | overlap | no-echo (0–2) | template smells | reply opening |
|---|---|---|---|---|---|
| echo-fw-1 | freewrite | 0.00 | 2 | 1 | That's wonderful to hear! |
| echo-fw-2 | freewrite | 0.00 | 2 | 1 | Crying in the bathroom…  It sounds like you’re feeling overwhelmed by that news. |
| echo-fw-3 | freewrite | 0.00 | 2 | 1 | Crying in the bathroom…  It sounds like there's a weight of silence hanging between you and Jordan. |
| echo-grat-1 | gratitude | 0.00 | 2 | 0 | Rosa's kindness is a lovely example of how good neighbors can make things better. |
| echo-grat-2 | gratitude | 0.00 | 2 | 1 | I hear that you were able to find some peace and quiet this morning. |
| echo-ci-1 | checkin | 0.00 | 2 | 1 | It sounds like you’ve had a challenging day. |
| echo-ci-2 | checkin | 0.00 | 2 | 1 | It sounds like you're feeling good about your presentation. |
| echo-tr-1 | thoughtrecord | 0.25 | 2 | 1 | It sounds like you're feeling worried about how the team meeting went. |
| echo-tr-2 | thoughtrecord | 0.00 | 2 | 1 | It sounds like you're worried about how your work messages are being received. |
| echo-fw-4 | freewrite | 0.00 | 2 | 1 | It sounds like you're feeling a little shaken after that call. |

**Headline: 10/10 cases open without echo (score 2); mean overlap 0.03.**

# Quality-Bar Rubric Report

Model: gemma-2-2b-it-q4f32_1-MLC. Generated 2026-07-16T07:16:10.546Z.
Pass = every scenario ≥ 85% of max AND zero turns scoring 0 on continuity or support.

## Summary

| Scenario | Mode | Score | % | Zero-critical turns | First trim | Pass |
|---|---|---|---|---|---|---|
| qb-freewrite-arc | freewrite | 75/86 | 87% | — | none | ✅ |
| qb-checkin-days | checkin | 73/86 | 85% | — | none | ❌ |
| qb-thoughtrecord-arc | thoughtrecord | 72/84 | 86% | — | none | ✅ |

## qb-freewrite-arc

| Turn | Continuity | Support | Personalization | No-echo | No-template | Score |
|---|---|---|---|---|---|---|
| 0 | 2 | 2 | — | 2 | 2 | 8/8 |
| 1 | 2 | 2 | — | 2 | 1 | 7/8 |
| 2 | 2 | 2 | — | 2 | 1 | 7/8 |
| 3 | 2 | 2 | — | 2 | 1 | 7/8 |
| 4 | 2 | 2 | — | 2 | 1 | 7/8 |
| 5 | 2 | 2 | 2 | 2 | 1 | 9/10 |
| 6 | 2 | 2 | 2 | 2 | 1 | 9/10 |
| 7 | 2 | 2 | — | 2 | 1 | 7/8 |
| 8 | 2 | 2 | — | 2 | 1 | 7/8 |
| 9 | 2 | 2 | 0 | 2 | 1 | 7/10 |

## qb-checkin-days

| Turn | Continuity | Support | Personalization | No-echo | No-template | Score |
|---|---|---|---|---|---|---|
| 0 | 2 | 2 | — | 2 | 1 | 7/8 |
| 1 | 2 | 2 | — | 2 | 1 | 7/8 |
| 2 | 2 | 2 | — | 2 | 1 | 7/8 |
| 3 | 2 | 2 | — | 2 | 1 | 7/8 |
| 4 | 2 | 2 | 1 | 2 | 1 | 8/10 |
| 5 | 2 | 2 | — | 2 | 1 | 7/8 |
| 6 | 2 | 2 | 0 | 2 | 1 | 7/10 |
| 7 | 2 | 2 | — | 2 | 1 | 7/8 |
| 8 | 2 | 2 | — | 2 | 1 | 7/8 |
| 9 | 2 | 2 | 2 | 2 | 1 | 9/10 |

## qb-thoughtrecord-arc

| Turn | Continuity | Support | Personalization | No-echo | No-template | Score |
|---|---|---|---|---|---|---|
| 0 | 2 | 2 | — | 2 | 2 | 8/8 |
| 1 | 2 | 2 | — | 2 | 1 | 7/8 |
| 2 | 2 | 2 | — | 2 | 1 | 7/8 |
| 3 | 2 | 2 | — | 2 | 1 | 7/8 |
| 4 | 2 | 2 | — | 2 | 1 | 7/8 |
| 5 | 2 | 2 | — | 2 | 1 | 7/8 |
| 6 | 2 | 2 | 1 | 2 | 1 | 8/10 |
| 7 | 2 | 2 | — | 2 | 1 | 7/8 |
| 8 | 2 | 2 | — | 2 | 1 | 7/8 |
| 9 | 2 | 2 | 0 | 2 | 1 | 7/10 |


## Transcript: qb-freewrite-arc

### Turn 0

**User**: I have a job interview on Thursday and I can't think about anything else. It's for a senior design role.

**Model**: Crying in the bathroom…  What's making you feel this way about your job interview on Thursday? 


### Turn 1

**User**: The hiring manager is named Priya. She seemed warm on the phone but I keep replaying everything I said and finding flaws.

**Model**: It sounds like you're feeling anxious about the interview with Priya, which is understandable. What are some things that have been coming up for you when thinking back to your conversation? 


### Turn 2

**User**: I spent all evening rearranging my portfolio instead of sleeping. Moved the case studies around four times and it might be worse now.

**Model**: It sounds like you're feeling a bit caught in the whirlwind of getting everything just right. What part of your portfolio feels most important to showcase?  


### Turn 3

**User**: I don't even know why this one matters so much to me.

**Model**: It sounds like Priya's interview is shaping up to be a big deal for you. What makes this particular opportunity so appealing, and how might that tie into your overall goals? 




### Turn 4

**User**: I think it's because I've been feeling invisible at my current job for over a year. Nobody there has looked at my work, really looked, in months.

**Model**: It sounds like the feeling of being unseen is weighing on you.  You've been thinking about this for weeks, and it makes sense why that might be at the forefront of your mind right now with Priya’s interview coming up. What are some things from those earlier conversations about work culture or expectations which make this opportunity feel different? 


### Turn 5

**User**: Tomorrow's the day. Can't tell if I'm excited or terrified.

**Model**: It sounds like you're feeling a mix of anticipation and nerves, which is completely normal. What specifically about Priya’s interview excites you? 


### Turn 6

**User**: It happened. I rambled on the second question but she laughed at my joke about spreadsheets. I have no idea how it went.

**Model**: It sounds like Priya’s interview is bringing up a lot of feelings.  Can you tell me what was particularly nerve-wracking about that moment with the conversation turning to humor? 


### Turn 7

**User**: Now comes the waiting. I hate waiting.

**Model**: It sounds like you're feeling that anticipation build up.  What about waiting has been challenging for you, specifically? 


### Turn 8

**User**: Part of me is already rehearsing the rejection so it won't hurt. Is that self-protection or just giving up early?

**Model**: It sounds like you're trying to prepare for all possibilities.  How do these different scenarios about the interview make your heart feel? 


### Turn 9

**User**: Either way, I noticed one thing: I did the scary thing this week. That has to count for something.

**Model**: It sounds like you're finding courage even when it feels difficult. What is that "scary thing" about which you feel brave enough to speak? 


## Transcript: qb-checkin-days

### Turn 0

**User**: Checking in. Tense today — the Harlow report is due Friday and I'm behind on it.

**Model**: The stress of that deadline is definitely weighing on you.  I hear how much this report means to you, and I'm sure it doesn’t feel good to be behind schedule with a project like the Harlow Report. How did your day go overall? 


### Turn 1

**User**: Slept badly, maybe five hours. My brain kept drafting report sections at 2am.

**Model**: I'm sorry to hear you didn’t sleep well. It sounds like that lack of rest is really making things difficult with the report and putting a strain on your brain as it works through all those sections at 2am.  How did your day go overall?   


### Turn 2

**User**: A bit better this morning. My friend Dan called and we walked by the river for an hour. First real exhale in days.

**Model**: I'm glad you had a walk with Dan, that sounds like just what your brain needed.  How did the day go overall? 


### Turn 3

**User**: Back to tense. Found an error in my data section this afternoon.

**Model**: I'm glad you had some time to connect with Dan.  It sounds like that walk was a real treat after all the stress of these deadlines, how did your day go overall? 


### Turn 4

**User**: Next day check-in. Still tired but I fixed the error last night.

**Model**: I'm glad you had some time to connect with Dan.  It sounds like that walk was a real treat after all the stress of these deadlines, how did your day go overall? 


### Turn 5

**User**: Feeling flat today. Not sad exactly, just gray.

**Model**: I'm sorry to hear that you are feeling flat.  It sounds like the stress and lack of sleep have really taken their toll on your energy levels, how did today go overall? 


### Turn 6

**User**: Deadline's tomorrow. Weirdly calm about it now?

**Model**: I'm glad you had some time to connect with Dan.  It sounds like that walk was a real treat after all the stress of these deadlines, how did your day go overall? 


### Turn 7

**User**: I submitted it. It's done.

**Model**: It sounds like you're starting to feel a bit more relaxed and ready for the day.  How did your day go overall? 


### Turn 8

**User**: Today I feel strangely empty instead of relieved. I expected to feel lighter.

**Model**: I'm glad you had a chance to connect with Dan.  It sounds like that walk was a real treat after all the stress of these deadlines, how did your day go overall? 


### Turn 9

**User**: Last check-in of the week. How do I not end up here again next time?

**Model**: I'm glad you had a chance to connect with Dan.  It sounds like that walk was a real treat after all the stress of these deadlines, how did your day go overall? 


## Transcript: qb-thoughtrecord-arc

### Turn 0

**User**: I want to work through something. I froze in the middle of standup this morning — lost my thread mid-sentence in front of the whole team.

**Model**: It must have been really frustrating to freeze mid-sentence.  How did that make you feel? 


### Turn 1

**User**: The thought stuck in my head is: everyone now thinks I'm incompetent.

**Model**: It sounds like that thought is taking up a lot of space.  How does it make you feel? 


### Turn 2

**User**: When I believe it, it's about a 90. My chest goes tight and I want to hide.

**Model**: It sounds like you're really struggling with that thought.  How does it make you feel to think about this? 


### Turn 3

**User**: Evidence for it... Marcus looked down at his laptop while I was struggling. And nobody said anything after.

**Model**: It sounds like there might be some evidence that's contributing to these thoughts. How does it make you feel knowing Marcus looked down at his laptop and nobody said anything? 


### Turn 4

**User**: Evidence against? I guess people lose their thread sometimes. My last review was strong.

**Model**: It sounds like you're trying to find evidence that challenges those thoughts.  What do people say about your last review? 


### Turn 5

**User**: Also, honestly, Marcus checks his laptop during everyone's updates. I've seen him do it to the team lead.

**Model**: It sounds like you're trying to find evidence that challenges those thoughts. How does it feel knowing Marcus checks his laptop during everyone’s updates?  


### Turn 6

**User**: So what would a more balanced version of the thought be?

**Model**: It sounds like you're trying to find evidence that challenges those thoughts. How does it feel knowing Marcus checks his laptop during everyone’s updates?  And how do others typically react when we struggle presenting something 


### Turn 7

**User**: Maybe: I had an awkward thirty seconds, and one awkward moment doesn't erase how my work is actually seen.

**Model**: It sounds like you're trying to find evidence that challenges those thoughts.  How does it make you feel knowing Marcus checks his laptop during everyone’s updates? How do others typically react when we struggle presenting something 


### Turn 8

**User**: Believability of the old thought now... maybe a 45.

**Model**: It sounds like you're trying to find evidence that challenges those thoughts.  How does it make you feel knowing Marcus checks his laptop during everyone’s updates? How do others typically react when we struggle presenting something 


### Turn 9

**User**: What should I actually do tomorrow morning when I walk into that room again?

**Model**: It sounds like you're trying to find evidence that challenges those thoughts.  How does it make you feel knowing Marcus checks his laptop during everyone’s updates? How do others typically react when we struggle presenting something 

