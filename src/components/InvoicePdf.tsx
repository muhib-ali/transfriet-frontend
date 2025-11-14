// src/components/InvoicePdf.tsx
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 36,
    color: "#0f172a",
  },
  companyInfo: {
    flexDirection: "column",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  companyName: {
    fontSize: 12,
    fontWeight: "bold",
  },
  companyAddress: {
    fontSize: 10,
  },
  companyPhone: {
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5b21b6", // Purple color as shown in the image
    marginBottom: 4,
  },
  rightBlock: {
    alignItems: "flex-end",
  },
  clientLabel: {
    marginBottom: 2,
  },
  clientName: {
    fontWeight: "bold",
    marginBottom: 2,
  },
  clientCenter: {
    marginBottom: 2,
  },
  clientPhone: {
    marginBottom: 2,
  },
  clientEmail: {
    marginBottom: 2,
  },
  invoiceDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    borderBottomWidth: 0,
    paddingBottom: 10,
  },
  detailColumn: {
    width: "30%",
  },
  detailLabel: {
    fontSize: 10,
    color: "#475569",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 10,
  },
  table: { 
    width: "100%", 
    marginTop: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 8,
  },
  tableRow: { 
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 8,
  },
  tableRowDescription: {
    fontSize: 9,
    color: "#64748b",
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  colItem: { width: "40%", paddingHorizontal: 8 },
  colQty: { width: "20%", textAlign: "center", paddingHorizontal: 8 },
  colPrice: { width: "20%", textAlign: "right", paddingHorizontal: 8 },
  colTotal: { width: "20%", textAlign: "right", paddingHorizontal: 8 },
  
  totals: { 
    width: "100%", 
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 4,
  },
  totalsLabel: { 
    width: "15%",
    textAlign: "right",
    paddingRight: 8,
  },
  totalsValue: {
    width: "15%",
    textAlign: "right",
    paddingHorizontal: 8,
  },
  totalsBold: { 
    fontWeight: "bold",
  },
});

export type InvoiceItem = {
  title: string;
  description?: string;
  qty: number;
  price: number;
  tax: number;
  total: number;
};

export type InvoicePdfProps = {
  number: string;
  createdAt: string;
  validUntil: string;
  shipper: string;
  consignee: string;
  destination: string;
  waybill: string;
  items: InvoiceItem[];
  subTotal: number;
  taxTotal: number;
  grandTotal: number;
  taxRate?: number;
  clientName?: string;
  clientCenter?: string;
  clientPhone?: string;
  clientEmail?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
};

const money = (n: number) => `$${n.toFixed(2)}`;
const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
  } catch (e) {
    return dateStr;
  }
};

// Default values for the invoice
const DEFAULT_VALUES = {
  companyName: "COMPANY Name",
  companyAddress: "25, Your Company Address",
  companyPhone: "00001231421",
  clientName: "Tauqeer Ali khan",
  clientCenter: "nadeem center",
  clientPhone: "+923458092112",
  clientEmail: "khanTauqeerAli@gmail.com",
  date: "31/08/2025",
  expiredDate: "30/09/2025",
  number: "1/2025",
  items: [
    {
      title: "Protein",
      description: "Protein shake",
      qty: 1,
      price: 5.00,
      total: 5.00
    }
  ],
  subTotal: 5.00,
  taxRate: 10,
  taxTotal: 0.50,
  grandTotal: 5.50
};

export default function InvoicePdf({
  number,
  createdAt,
  validUntil,
  shipper,
  consignee,
  destination,
  waybill,
  items,
  subTotal,
  taxTotal,
  grandTotal,
  taxRate = 10,
  clientName,
  clientCenter,
  clientPhone,
  clientEmail,
  companyName,
  companyAddress,
  companyPhone
}: InvoicePdfProps) {
  // Use default values if data is not provided
  const displayCompanyName = companyName || DEFAULT_VALUES.companyName;
  const displayCompanyAddress = companyAddress || DEFAULT_VALUES.companyAddress;
  const displayCompanyPhone = companyPhone || DEFAULT_VALUES.companyPhone;
  
  const displayClientName = clientName || consignee || DEFAULT_VALUES.clientName;
  const displayClientCenter = clientCenter || DEFAULT_VALUES.clientCenter;
  const displayClientPhone = clientPhone || DEFAULT_VALUES.clientPhone;
  const displayClientEmail = clientEmail || DEFAULT_VALUES.clientEmail;
  
  const displayDate = createdAt ? formatDate(createdAt) : DEFAULT_VALUES.date;
  const displayExpiredDate = validUntil ? formatDate(validUntil) : DEFAULT_VALUES.expiredDate;
  const displayNumber = number || DEFAULT_VALUES.number;
  
  const displayItems = items && items.length > 0 ? items : DEFAULT_VALUES.items;
  const displaySubTotal = typeof subTotal === 'number' ? subTotal : DEFAULT_VALUES.subTotal;
  const displayTaxRate = typeof taxRate === 'number' ? taxRate : DEFAULT_VALUES.taxRate;
  // Ensure tax total is a number and not NaN or undefined
  const displayTaxTotal = typeof taxTotal === 'number' && !isNaN(taxTotal) ? taxTotal : DEFAULT_VALUES.taxTotal;
  // Ensure grand total is a number and not NaN or undefined
  const displayGrandTotal = typeof grandTotal === 'number' && !isNaN(grandTotal) ? grandTotal : DEFAULT_VALUES.grandTotal;

  return (
    <Document title={`Invoice ${displayNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Company Info */}
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{displayCompanyName}</Text>
          <Text style={styles.companyAddress}>{displayCompanyAddress}</Text>
          <Text style={styles.companyPhone}>{displayCompanyPhone}</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Invoice</Text>
          </View>
          <View style={styles.rightBlock}>
            <Text style={styles.clientLabel}>Client:</Text>
            <Text style={styles.clientName}>{displayClientName}</Text>
            <Text style={styles.clientCenter}>{displayClientCenter}</Text>
            <Text style={styles.clientPhone}>{displayClientPhone}</Text>
            <Text style={styles.clientEmail}>{displayClientEmail}</Text>
          </View>
        </View>

        {/* Invoice Details */}
        <View style={styles.invoiceDetails}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{displayDate}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Expired Date:</Text>
            <Text style={styles.detailValue}>{displayExpiredDate}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Number:</Text>
            <Text style={styles.detailValue}>#{displayNumber}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colItem}>Item</Text>
            <Text style={styles.colQty}>Quantity</Text>
            <Text style={styles.colPrice}>Price</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>

          {displayItems.map((it, i) => (
            <View key={i} style={[styles.tableRow, i === displayItems.length - 1 ? styles.lastRow : {}]}>
              <View style={styles.colItem}>
                <Text>{it.title}</Text>
                {it.description && <Text style={styles.tableRowDescription}>{it.description}</Text>}
              </View>
              <Text style={styles.colQty}>{it.qty}</Text>
              <Text style={styles.colPrice}>{money(it.price)}</Text>
              <Text style={styles.colTotal}>{money(it.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sub Total</Text>
            <Text style={styles.totalsValue}>{money(displaySubTotal)}</Text>
          </View>
          {displayTaxTotal > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax {displayTaxRate}%</Text>
              <Text style={styles.totalsValue}>{money(displayTaxTotal)}</Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsLabel, styles.totalsBold]}>Total</Text>
            <Text style={[styles.totalsValue, styles.totalsBold]}>{money(displayGrandTotal)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
