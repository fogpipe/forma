import React, { forwardRef } from "react";
import { FormRenderer } from "../FormRenderer.js";
import type { FormRendererProps, FormRendererHandle } from "../FormRenderer.js";
import {
  defaultComponentMap,
  defaultFieldWrapper,
  defaultLayout,
  defaultWizardLayout,
  defaultPageWrapper,
} from "./componentMap.js";

export interface DefaultFormRendererProps
  extends Omit<FormRendererProps, "components"> {
  /** Component map (defaults to defaultComponentMap if not provided) */
  components?: FormRendererProps["components"];
  /** Use wizard layout for multi-page forms */
  wizardLayout?: boolean;
}

export const DefaultFormRenderer = forwardRef<
  FormRendererHandle,
  DefaultFormRendererProps
>(function DefaultFormRenderer(props, ref) {
  const {
    components,
    wizardLayout,
    layout,
    fieldWrapper,
    pageWrapper,
    ...rest
  } = props;

  return (
    <FormRenderer
      ref={ref}
      components={components ?? defaultComponentMap}
      fieldWrapper={fieldWrapper ?? defaultFieldWrapper}
      layout={layout ?? (wizardLayout ? defaultWizardLayout : defaultLayout)}
      pageWrapper={pageWrapper ?? defaultPageWrapper}
      {...rest}
    />
  );
});
