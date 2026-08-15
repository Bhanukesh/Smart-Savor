import Topbar from "@/components/Topbar";
import PortalNav from "@/components/PortalNav";
import BodyClass from "@/components/BodyClass";
import { getSessionPatient, getShoppingList } from "@/lib/data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

// Whichever food is currently picked on the Swap screen for each focus area — a standing
// reference to shop from, not a history. Re-picking a food for the same gap (Swap screen)
// replaces its entry here immediately (lib/data.ts's createChoice supersedes the old pick).
export default async function ShoppingListPage() {
  const patient = await getSessionPatient();
  if (!patient) notFound();
  const items = await getShoppingList(patient.id);

  return (
    <>
      <BodyClass name="patient" />
      <Topbar
        context="Shopping List"
        who={
          <>
            <i className="ph ph-user ic-primary" /> <b>{patient.name}</b> · plan by <b>{patient.dietitianName}</b>
          </>
        }
      />
      <main className="wrap">
        <PortalNav />
        <p className="eyebrow">Shopping List</p>
        <h1>
          What to <em>buy</em> this trip
        </h1>
        <p className="sub">
          Whatever you&apos;ve currently picked on the Swap screen for each focus area — pick
          something else there and this list updates.
        </p>

        <div className="card">
          <h2>
            <i className="ph ph-shopping-cart-simple ic-primary" /> Your picks
          </h2>
          {items.length === 0 ? (
            <p className="sub" style={{ margin: 0 }}>
              Nothing picked yet — head to the Swap screen and choose a food for each focus area.
            </p>
          ) : (
            items.map((it) => (
              <div className="row" key={it.nutrientGapId}>
                <div className="grow">
                  <div className="title">{it.foodName}</div>
                  <div className="meta">
                    {it.servingsText} · for your {it.nutrientLabel} · picked{" "}
                    {new Date(it.chosenAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
