"use client";

import { PublicLayout } from "@/components/dental/layout/PublicLayout";
import { CabinetConfigurator } from "@/components/dental/configurator/CabinetConfigurator";

/**
 * /configurateur — native route for the interactive cabinet configurator.
 * Wraps CabinetConfigurator in the public layout (Header + Footer + widgets).
 */
export default function ConfigurateurRoute() {
  return (
    <PublicLayout>
      <CabinetConfigurator />
    </PublicLayout>
  );
}
