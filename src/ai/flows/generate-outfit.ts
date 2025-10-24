
// src/ai/flows/generate-outfit.ts
'use server';

/**
 * @fileOverview A flow for generating outfits using AI, based on user's clothing items and style preferences.
 *
 * - generateOutfit - A function that generates an outfit given a list of clothing items and style preferences.
 * - GenerateOutfitInput - The input type for the generateOutfit function.
 * - GenerateOutfitOutput - The return type for the generateOutfit function.
 */

import { Outfit } from '@/types';
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const outfitCategories = [
    'Casual', 'Business Casual', 'Activewear', 'Loungewear', 'Night Out', 'Smart Casual', 'Vacation', 'Seasonal', 'Special Occasion', 'Formal'
];

// Define schemas for input and output
const GenerateOutfitInputSchema = z.object({
  clothingItems: z.array(
    z.object({
      type: z.string().describe('The type of clothing item (e.g., shirt, pants, dress).'),
      color: z.string().describe('The color of the clothing item.'),
      texture: z.string().describe('The texture of the clothing item (e.g., cotton, silk, denim).'),
      brand: z.string().describe('The brand of the clothing item.'),
      fit: z.string().describe('The fit of the clothing item (e.g., slim, regular, oversized).'),
      season: z.enum(['summer', 'winter', 'spring', 'fall', 'all']).describe('The season the clothing item is suitable for.'),
    })
  ).describe('An array of clothing items to generate an outfit from.'),
  stylePreferences: z.string().describe('The user\u2019s style preferences (e.g., casual, formal, bohemian).'),
  outfitRequirements: z.string().optional().describe('Additional outfit requirements or constraints (e.g., for a specific event).'),
  existingOutfits: z.array(z.any()).optional().describe('An array of the user\'s existing outfits.'), // Use z.any() for now, refine if needed
  unusedItemPriority: z.number().min(0).max(1).optional().describe('Priority to give to unused items (0-1).'),
});
export type GenerateOutfitInput = z.infer<typeof GenerateOutfitInputSchema>;

const GenerateOutfitOutputSchema = z.object({
    outfits: z.array(z.object({
        name: z.string().describe("A short, catchy name for the outfit (e.g., 'Casual Friday', 'Summer Evening')."),
        description: z.string().describe('A description of the generated outfit.'),
        category: z.enum(outfitCategories as [string, ...string[]]).describe('The most appropriate category for the outfit.'),
        itemsUsed: z.array(
            z.object({
                type: z.string().describe('The type of clothing item.'),
                color: z.string().describe('The color of the clothing item.'),
            })
        ).describe('List of clothing items used in the outfit.'),
    })).describe('An array of 3 distinct outfit suggestions.'),
});
export type GenerateOutfitOutput = z.infer<typeof GenerateOutfitOutputSchema>;

// Exported function to generate an outfit
export async function generateOutfit(input: GenerateOutfitInput): Promise<GenerateOutfitOutput> {
  return generateOutfitFlow(input);
}

// Define the prompt
const outfitPrompt = ai.definePrompt({
  name: 'outfitPrompt',
  input: {schema: GenerateOutfitInputSchema},
  output: {schema: GenerateOutfitOutputSchema},
  prompt: `You are a personal stylist helping users create outfits from their existing wardrobe.

        Based on the user's clothing items and preferences, generate 3 distinct outfit suggestions.
        For each outfit, provide a unique name, a compelling description, the list of items used, and assign it to one of the following categories:
        ${outfitCategories.join(', ')}

        Consider the user's style preferences, clothing items, and any outfit requirements provided.
        Follow these outfit best practices:
        - Ensure the outfit is appropriate for the specified season. Items marked 'all' can be used for any season.
        - Combine colors and textures that complement each other.
        - If provided, consider the user's existing outfits and the desired priority for using items not found in those outfits.
        - A higher 'unusedItemPriority' (on a scale of 0 to 1, where 1 is highest) means you should actively try to incorporate clothing items that have not been used in the user's existing outfits.
        - Aim to use a diverse range of items from the user's collection, especially prioritizing less-used items when the 'unusedItemPriority' is set high.

        Existing Outfits (if provided):
        {{#if existingOutfits}}{{#each existingOutfits}}- {{this.name}}: {{#each this.itemIds}}{{this}}, {{/each}}
        {{/each}}{{else}}No existing outfits provided.{{/if}}
        - Consider the fit of the clothing items to create a balanced silhouette.

        User Style Preferences: {{{stylePreferences}}}
        Clothing Items: {{#each clothingItems}}{{{this.type}}} ({{{this.color}}}, {{{this.texture}}}, {{{this.brand}}}, {{{this.fit}}}, {{{this.season}}}) {{/each}}
        Outfit Requirements: {{{outfitRequirements}}}
        `,
});

// Define the flow
const generateOutfitFlow = ai.defineFlow(
  {
    name: 'generateOutfitFlow',
    inputSchema: GenerateOutfitInputSchema,
    outputSchema: GenerateOutfitOutputSchema,
  },
  async input => {
    const {output} = await outfitPrompt(input);
    return output!;
  }
);
