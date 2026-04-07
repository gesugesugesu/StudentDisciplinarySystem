import { Incident, Student } from "../types";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToCSV(incidents: Incident[], students: Student[], filename: string = "incidents-report.csv") {
  // Prepare CSV headers
  const headers = [
    "Date",
    "Student Name",
    "Grade",
    "Class",
    "Type",
    "Category",
    "Description",
    "Action Taken",
    "Status",
    "Reported By"
  ];

  // Prepare CSV rows
  const rows = incidents.map(incident => {
    const student = students.find(s => s.id === incident.studentId);
    
    return [
      format(new Date(incident.date), "MM/dd/yyyy"),
      student?.name || "Unknown",
      student?.grade || "",
      student?.class || "",
      incident.type,
      incident.severity,
      incident.description,
      incident.actionTaken,
      incident.status,
      incident.reportedBy
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(incidents: Incident[], students: Student[], filename: string = "incidents-report.pdf") {
  const doc = new jsPDF();
  
  // Add system logo/branding header
  doc.setFillColor(3, 2, 19); // Dark navy color from the system
  doc.rect(0, 0, 210, 25, 'F');
  
  // Add system name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("D-Manage: Computerized Student Disciplinary Management", 14, 12);
  doc.setFontSize(10);
  doc.text("Disciplinary Incidents Report", 14, 18);
  
  // Reset text color for rest of document
  doc.setTextColor(0, 0, 0);
  
  // Add generation date
  doc.setFontSize(10);
  doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, 14, 33);
  
  // Prepare table data
  const tableData = incidents.map(incident => {
    const student = students.find(s => s.id === incident.studentId);
    
    return [
      format(new Date(incident.date), "MM/dd/yy"),
      student?.name || "Unknown",
      `${student?.grade || ""}-${student?.class || ""}`,
      incident.type,
      incident.severity,
      incident.status,
      incident.reportedBy
    ];
  });

  // Add table
  autoTable(doc, {
    head: [["Date", "Student", "Grade", "Type", "Category", "Status", "Reported By"]],
    body: tableData,
    startY: 40,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [3, 2, 19] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Add summary statistics
  const finalY = (doc as any).lastAutoTable.finalY || 40;
  doc.setFontSize(12);
  doc.text("Summary Statistics", 14, finalY + 15);
  
  doc.setFontSize(10);
  const totalIncidents = incidents.length;
  const category3Count = incidents.filter(i => i.severity === "Category 3 Offense").length;
  const category2Count = incidents.filter(i => i.severity === "Category 2 Offense").length;
  const category1Count = incidents.filter(i => i.severity === "Category 1 Offense").length;
  const openCount = incidents.filter(i => i.status === "Open").length;
  
  doc.text(`Total Incidents: ${totalIncidents}`, 14, finalY + 23);
  doc.text(`Category 1 Offenses: ${category1Count}`, 14, finalY + 30);
  doc.text(`Category 2 Offenses: ${category2Count}`, 14, finalY + 37);
  doc.text(`Category 3 Offenses: ${category3Count}`, 14, finalY + 44);
  doc.text(`Open Cases: ${openCount}`, 14, finalY + 51);

  // Add footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(3, 2, 19);
  doc.rect(0, pageHeight - 15, 210, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("D-Manage: Computerized Student Disciplinary Management", 14, pageHeight - 7);
  doc.text(`Page 1`, 185, pageHeight - 7);

  // Save the PDF
  doc.save(filename);
}

export function exportStudentReport(student: Student, incidents: Incident[], filename?: string) {
  const doc = new jsPDF();

  // Add system logo/branding header
  doc.setFillColor(3, 2, 19); // Dark navy color from the system
  doc.rect(0, 0, 210, 25, 'F');
  
  // Add system name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("D-Manage: Computerized Student Disciplinary Management", 14, 12);
  doc.setFontSize(10);
  doc.text("Student Disciplinary Report", 14, 18);
  
  // Reset text color for rest of document
  doc.setTextColor(0, 0, 0);

  // Student information
  doc.setFontSize(12);
  doc.text("Student Information", 14, 38);
  doc.setFontSize(10);
  doc.text(`Name: ${student.name}`, 14, 46);
  doc.text(`Grade: ${student.grade}`, 14, 53);
  doc.text(`Class: ${student.class}`, 14, 60);
  doc.text(`Email: ${student.email}`, 14, 67);

  // Incidents table
  doc.setFontSize(12);
  doc.text("Incident History", 14, 74);

  const tableData = incidents.map(incident => {
    return [
      format(new Date(incident.date), "MM/dd/yy"),
      incident.type,
      incident.severity,
      incident.description.substring(0, 40) + (incident.description.length > 40 ? "..." : ""),
      incident.status,
    ];
  });

  autoTable(doc, {
    head: [["Date", "Type", "Category", "Description", "Status"]],
    body: tableData,
    startY: 79,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [3, 2, 19] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Add footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(3, 2, 19);
  doc.rect(0, pageHeight - 15, 210, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("D-Manage: Computerized Student Disciplinary Management", 14, pageHeight - 7);

  // Save the PDF
  const pdfFilename = filename || `${student.name.replace(/\s+/g, "-")}-report.pdf`;
  doc.save(pdfFilename);
}

export function exportStudentIncidentsCSV(student: Student, incidents: Incident[], filename?: string) {
  // Prepare CSV headers
  const headers = [
    "Date",
    "Type",
    "Category",
    "Description",
    "Action Taken",
    "Status",
    "Reported By"
  ];

  // Prepare CSV rows
  const rows = incidents.map(incident => {
    return [
      format(new Date(incident.date), "MM/dd/yyyy"),
      incident.type,
      incident.severity,
      incident.description,
      incident.actionTaken,
      incident.status,
      incident.reportedBy
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  const csvFilename = filename || `${student.name.replace(/\s+/g, "-")}-incidents.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", csvFilename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function filterIncidentsByWeek(incidents: Incident[]): Incident[] {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  return incidents.filter(incident => {
    const incidentDate = new Date(incident.date);
    return incidentDate >= weekStart && incidentDate <= weekEnd;
  });
}

export function filterIncidentsByMonth(incidents: Incident[]): Incident[] {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  return incidents.filter(incident => {
    const incidentDate = new Date(incident.date);
    return incidentDate >= monthStart && incidentDate <= monthEnd;
  });
}

export function exportWeeklyReport(incidents: Incident[], students: Student[], format: 'csv' | 'pdf' = 'pdf') {
  const weeklyIncidents = filterIncidentsByWeek(incidents);
  const filename = `weekly-incidents-report-${format === 'csv' ? 'csv' : 'pdf'}`;

  if (format === 'csv') {
    exportToCSV(weeklyIncidents, students, filename);
  } else {
    exportToPDF(weeklyIncidents, students, filename);
  }
}

export function exportMonthlyReport(incidents: Incident[], students: Student[], format: 'csv' | 'pdf' = 'pdf') {
  const monthlyIncidents = filterIncidentsByMonth(incidents);
  const filename = `monthly-incidents-report-${format === 'csv' ? 'csv' : 'pdf'}`;

  if (format === 'csv') {
    exportToCSV(monthlyIncidents, students, filename);
  } else {
    exportToPDF(monthlyIncidents, students, filename);
  }
}
