-- Local development data only
INSERT INTO streams (id, owner_id, name, kind, content_type, category, conversation_topic, is_conversation, description, listeners, rating_sum, rating_count) VALUES
 ('s1','dev','Night Synth',      'HOT',  'MUSIC',        'MUSIC',     NULL,                    0, 'Synthwave all night',           0, 0, 0),
 ('s2','dev','Tech Hour',        'HOT',  'CONVERSATION', 'TALK_SHOW', 'Open source and money', 1, 'Weekly talk about software',    0, 0, 0),
 ('s3','dev','Road Stories',     'COLD', 'CONVERSATION', 'PODCAST',   'Travelling by train',   1, 'Archive of travel stories',     0, 0, 0),
 ('s4','dev','Music and Chat',   'HOT',  'MIXED',        'INTERVIEW', 'Indie developers',      1, 'Tracks and short interviews',   0, 0, 0);
