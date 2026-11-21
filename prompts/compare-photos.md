# Prompt log: Photos of the real circuit in Compare views (issue #208)

1. Hanif's prompt (his words, November 21): "For photos and fault clips, find them online first. If you exhausted your search, write a prompt that I can use to generate clip and photos on image generation models"

   A search agent found photos of the exact circuit from SparkFun Electronics (CC BY-SA 4.0). It found no clip of a loose wire with a license that we can use. Claude wrote generation prompts for the clip and told Hanif the limits of the two photos: one shows a SparkFun RedBoard and not an Uno, one has the resistor after the LED, and both have a 330 Ω resistor.

2. Hanif's prompt (his words): "add sparkfun photos by opening another PR"

3. What Claude did:
   - Put the two photos in `public/lessons/af-led/` (WebP, edges cut so that the parts are larger).
   - `content/lessons/af-led.json`: `media.photos` with `ref` (RedBoard, the same order of parts as the lesson) and `layout2` (Arduino Uno, the resistor after the LED), each with a title, a text description, a note about what is different from the lesson, and the credit with the license. A point for each terminal that a photo shows. Claude looked at each picture at a large size to put the points, and made check pictures with the points drawn on them.
   - The photo view: a button for each photo, the name of the selected point on the photo, a text when the selection is not in the photo or has one end only, a note for a connection that is not direct in the second layout, and the credit under the photo.
   - Tests for the points, the credit and the files. A browser check on a local test page that is not in the repository.
   - No fault clip and no questions.
