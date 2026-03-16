import type { ComponentMap } from "../types.js";
import { TextInput } from "./components/TextInput.js";
import { TextareaInput } from "./components/TextareaInput.js";
import { NumberInput, IntegerInput } from "./components/NumberInput.js";
import { BooleanInput } from "./components/BooleanInput.js";
import { DateInput, DateTimeInput } from "./components/DateInput.js";
import { SelectInput } from "./components/SelectInput.js";
import { MultiSelectInput } from "./components/MultiSelectInput.js";
import { ArrayField } from "./components/ArrayField.js";
import { ObjectField } from "./components/ObjectField.js";
import { ComputedDisplay } from "./components/ComputedDisplay.js";
import { DisplayField } from "./components/DisplayField.js";
import { MatrixField } from "./components/MatrixField.js";
import { FallbackField } from "./components/FallbackField.js";
import { FieldWrapper } from "./layout/FieldWrapper.js";
import { FormLayout } from "./layout/FormLayout.js";
import { WizardLayout } from "./layout/WizardLayout.js";
import { PageWrapper } from "./layout/PageWrapper.js";

export const defaultComponentMap: ComponentMap = {
  text: TextInput,
  email: TextInput,
  phone: TextInput,
  url: TextInput,
  password: TextInput,
  textarea: TextareaInput,
  number: NumberInput,
  integer: IntegerInput,
  boolean: BooleanInput,
  date: DateInput,
  datetime: DateTimeInput,
  select: SelectInput,
  multiselect: MultiSelectInput,
  array: ArrayField,
  object: ObjectField,
  computed: ComputedDisplay,
  display: DisplayField,
  matrix: MatrixField,
  fallback: FallbackField,
};

export const defaultFieldWrapper = FieldWrapper;
export const defaultLayout = FormLayout;
export const defaultWizardLayout = WizardLayout;
export const defaultPageWrapper = PageWrapper;
