
import { getPlannerEntries } from '@/app/actions';
import OutfitPlanner from '@/components/planner/OutfitPlanner';
import { auth } from 'firebase-admin';

// This page now gets initial entries on the client-side within the component
// to ensure it can pass the user's auth state.
export default async function PlannerPage() {

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline text-primary">Outfit Planner</h1>
        <p className="text-muted-foreground mt-2">
          Plan your style week by week. Drag and drop your saved outfits onto the calendar.
        </p>
      </div>
      <OutfitPlanner initialPlannerEntries={[]} />
    </div>
  );
}
