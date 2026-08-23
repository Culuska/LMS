import { RequestUploadDto } from '../../storage/dto/request-upload.dto';

/** Same shape as the generic upload request — kept as its own class (rather than
 * reusing RequestUploadDto directly on the route) so each owner type can grow its own
 * fields later without disturbing the shared one. */
export class AttachResourceDto extends RequestUploadDto {}
