-- 2D Sticker: where an admin-added clothing picture sits on the flat 2D koala.
-- JSON {"x":..,"y":..,"w":..,"h":..} in the 2D koala's own space (koala-art.js FULL_VIEW, 200 x 205).
-- NULL = an older item whose picture is drawn over the whole view box, as before.
ALTER TABLE items ADD COLUMN fit2d_json TEXT;
