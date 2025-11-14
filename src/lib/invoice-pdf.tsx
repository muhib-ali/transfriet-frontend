import { saveAs } from "file-saver";
import { pdf } from "@react-pdf/renderer";
import InvoicePdf, { InvoicePdfProps } from "@/components/InvoicePdf";

export async function downloadInvoicePdf(props: InvoicePdfProps) {
  const blob = await pdf(<InvoicePdf {...props} />).toBlob();
  saveAs(blob, `invoice-${props.number}.pdf`);
}
