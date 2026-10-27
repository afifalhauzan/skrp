import type { Request, Response } from "express";
import type { StudentService } from "../services/studentService";
import {
  createStudentBody,
  importStudentsBody,
  listStudentsQuery,
  studentCodeParam,
  updateStudentBody,
} from "../validators";

export class StudentController {
  constructor(private readonly service: StudentService) {}

  getProfile = async (req: Request, res: Response) => {
    const code = studentCodeParam.parse(req.params.studentCode);
    res.json({ data: await this.service.getProfile(code) });
  };

  list = async (req: Request, res: Response) => {
    const { limit, after } = listStudentsQuery.parse(req.query);
    res.json({ data: await this.service.list(limit, after) });
  };

  create = async (req: Request, res: Response) => {
    const { attendanceNumber, ...fields } = createStudentBody.parse(req.body);
    res
      .status(201)
      .json({ data: await this.service.create(attendanceNumber, fields) });
  };

  update = async (req: Request, res: Response) => {
    const code = studentCodeParam.parse(req.params.studentCode);
    res.json({
      data: await this.service.update(code, updateStudentBody.parse(req.body)),
    });
  };

  importRoster = async (req: Request, res: Response) => {
    const { students } = importStudentsBody.parse(req.body);
    res.json({ data: await this.service.importRoster(students) });
  };
}
