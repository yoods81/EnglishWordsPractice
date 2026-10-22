-- 3D Pop-out wardrobe: where an admin-added clothing picture sits on the 3D koala.
-- JSON {"x":..,"y":..,"w":..,"h":..} in the 3D koala picture's own pixel space
-- (the same space as KBOX in public/js/koala-house-ui.js). NULL = not placed yet,
-- so the item is simply not shown in the 3D wardrobe.
ALTER TABLE items ADD COLUMN fit_json TEXT;
