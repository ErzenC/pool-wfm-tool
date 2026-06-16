"use server";

type LocalWorkerImport = {
  employeeCode: string;
};

type LocalAssignmentImport = {
  date: string;
  workerId: string;
  sectorId: string;
  shift: 1 | 2;
};

export async function validateLocalStorageImport(input: {
  workers: LocalWorkerImport[];
  assignments: LocalAssignmentImport[];
}) {
  const employeeCodes = new Set<string>();
  const duplicateEmployeeCodes = new Set<string>();

  input.workers.forEach((worker) => {
    if (employeeCodes.has(worker.employeeCode)) {
      duplicateEmployeeCodes.add(worker.employeeCode);
    }

    employeeCodes.add(worker.employeeCode);
  });

  const assignmentKeys = new Set<string>();
  const duplicateAssignments = new Set<string>();

  input.assignments.forEach((assignment) => {
    const key = `${assignment.workerId}:${assignment.date}`;

    if (assignmentKeys.has(key)) {
      duplicateAssignments.add(key);
    }

    assignmentKeys.add(key);
  });

  return {
    valid: duplicateEmployeeCodes.size === 0 && duplicateAssignments.size === 0,
    duplicateEmployeeCodes: Array.from(duplicateEmployeeCodes),
    duplicateAssignments: Array.from(duplicateAssignments),
  };
}
