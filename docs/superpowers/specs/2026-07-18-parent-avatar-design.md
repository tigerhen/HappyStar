# Parent Avatar Design

## Goal

Replace the generic family emoji on the login screen with the user-approved illustrated portrait of a young married couple.

## Visual Contract

- Use the approved square portrait: father on the left, mother on the right wearing thin round glasses.
- Keep the warm cream background and Japanese-inspired family illustration style consistent with the two child avatars.
- The composition must remain readable inside the existing circular `Avatar` crop at 56px and 72px.
- Do not add text, symbols, stars, borders, or decorative lines.

## Integration

- Store the optimized asset at `web/public/avatars/parents.png`.
- Use it on the parent login selection card and the parent PIN entry screen.
- Keep `👪` as the `Avatar` fallback if the image cannot be used.
- Do not change the parent administration header or any child avatar.

## Performance And Verification

- Resize the approved 1254px source to 512px square for browser delivery.
- Verify the login flow with a component test, run all frontend tests, and build the production bundle.
- Inspect the final login screen at desktop and mobile widths, including the circular crop.
