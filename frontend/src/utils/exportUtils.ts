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
    "Severity",
    "Description",
    "Action Taken",
    "Status",
    "Reported By",
    "Parent Notified"
  ];

  // Prepare CSV rows
  const rows = incidents.map(incident => {
    const student = students.find(s => s.id === incident.studentId);
    const hasParentNotification = incident.communicationLogs && incident.communicationLogs.length > 0;
    
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
      incident.reportedBy,
      hasParentNotification ? "Yes" : "No"
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
  
  // Add title
  doc.setFontSize(18);
  doc.text("Disciplinary Incidents Report", 14, 22);
  
  // Add generation date
  doc.setFontSize(10);
  doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, 14, 30);
  
  // Prepare table data
  const tableData = incidents.map(incident => {
    const student = students.find(s => s.id === incident.studentId);
    const hasParentNotification = incident.communicationLogs && incident.communicationLogs.length > 0;
    
    return [
      format(new Date(incident.date), "MM/dd/yy"),
      student?.name || "Unknown",
      `${student?.grade || ""}-${student?.class || ""}`,
      incident.type,
      incident.severity,
      incident.status,
      incident.reportedBy,
      hasParentNotification ? "Yes" : "No"
    ];
  });

  // Add table
  autoTable(doc, {
    head: [["Date", "Student", "Grade", "Type", "Severity", "Status", "Reported By", "Parent Notified"]],
    body: tableData,
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [3, 2, 19] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Add summary statistics
  const finalY = (doc as any).lastAutoTable.finalY || 35;
  doc.setFontSize(12);
  doc.text("Summary Statistics", 14, finalY + 15);
  
  doc.setFontSize(10);
  const totalIncidents = incidents.length;
  const severeCount = incidents.filter(i => i.severity === "Severe").length;
  const openCount = incidents.filter(i => i.status === "Open").length;
  const parentNotifiedCount = incidents.filter(i => i.communicationLogs && i.communicationLogs.length > 0).length;
  
  doc.text(`Total Incidents: ${totalIncidents}`, 14, finalY + 23);
  doc.text(`Severe Incidents: ${severeCount}`, 14, finalY + 30);
  doc.text(`Open Cases: ${openCount}`, 14, finalY + 37);
  doc.text(`Parent Notifications Sent: ${parentNotifiedCount}`, 14, finalY + 44);

  // Save the PDF
  doc.save(filename);
}

export function exportStudentReport(student: Student, incidents: Incident[], filename?: string) {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text("Student Disciplinary Report", 14, 22);

  // Student information
  doc.setFontSize(12);
  doc.text("Student Information", 14, 35);
  doc.setFontSize(10);
  doc.text(`Name: ${student.name}`, 14, 43);
  doc.text(`Grade: ${student.grade}`, 14, 50);
  doc.text(`Class: ${student.class}`, 14, 57);
  doc.text(`Email: ${student.email}`, 14, 64);

  if (student.parentName) {
    doc.text(`Parent: ${student.parentName}`, 14, 71);
    doc.text(`Parent Email: ${student.parentEmail || "N/A"}`, 14, 78);
    doc.text(`Parent Phone: ${student.parentPhone || "N/A"}`, 14, 85);
  }

  // Incidents table
  doc.setFontSize(12);
  doc.text("Incident History", 14, student.parentName ? 95 : 75);

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
    head: [["Date", "Type", "Severity", "Description", "Status"]],
    body: tableData,
    startY: student.parentName ? 100 : 80,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [3, 2, 19] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Save the PDF
  const pdfFilename = filename || `${student.name.replace(/\s+/g, "-")}-report.pdf`;
  doc.save(pdfFilename);
}

export function exportStudentIncidentsCSV(student: Student, incidents: Incident[], filename?: string) {
  // Prepare CSV headers
  const headers = [
    "Date",
    "Type",
    "Severity",
    "Description",
    "Action Taken",
    "Status",
    "Reported By",
    "Parent Notified"
  ];

  // Prepare CSV rows
  const rows = incidents.map(incident => {
    const hasParentNotification = incident.communicationLogs && incident.communicationLogs.length > 0;

    return [
      format(new Date(incident.date), "MM/dd/yyyy"),
      incident.type,
      incident.severity,
      incident.description,
      incident.actionTaken,
      incident.status,
      incident.reportedBy,
      hasParentNotification ? "Yes" : "No"
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
