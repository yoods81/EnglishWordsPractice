-- Part of speech on shared words, and the four-stage level scheme.
-- level_en / level_ko now hold one of: elem_low, elem_high, middle, high
-- (lower primary, upper primary, middle school, high school).
ALTER TABLE shared_words ADD COLUMN pos TEXT;

UPDATE shared_words SET level_en = CASE level_en
  WHEN 'year4' THEN 'elem_low'
  WHEN 'year5' THEN 'elem_high'
  WHEN 'year6' THEN 'elem_high'
  WHEN 'year7' THEN 'middle'
  WHEN 'kr_elem6' THEN 'elem_high'
  WHEN 'kr_mid1' THEN 'middle'
  WHEN 'kr_mid2' THEN 'middle'
  WHEN 'kr_mid3' THEN 'middle'
  WHEN 'kr_high' THEN 'high'
  ELSE level_en END
WHERE level_en IN ('year4','year5','year6','year7','kr_elem6','kr_mid1','kr_mid2','kr_mid3','kr_high');

UPDATE shared_words SET level_ko = CASE level_ko
  WHEN 'year4' THEN 'elem_low'
  WHEN 'year5' THEN 'elem_high'
  WHEN 'year6' THEN 'elem_high'
  WHEN 'year7' THEN 'middle'
  WHEN 'kr_elem6' THEN 'elem_high'
  WHEN 'kr_mid1' THEN 'middle'
  WHEN 'kr_mid2' THEN 'middle'
  WHEN 'kr_mid3' THEN 'middle'
  WHEN 'kr_high' THEN 'high'
  ELSE level_ko END
WHERE level_ko IN ('year4','year5','year6','year7','kr_elem6','kr_mid1','kr_mid2','kr_mid3','kr_high');
