// Typed auth errors (docs/REQUIREMENTS §6.0). The API layer maps these to
// responses — crucially WITHOUT revealing whether an email exists (no user
// enumeration, §7): e.g. a taken email during registration and a bad login
// must look the same to an attacker probing addresses.

export class EmailAlreadyInUse extends Error {
  constructor() {
    super("email already in use");
    this.name = "EmailAlreadyInUse";
  }
}

export class UsernameAlreadyInUse extends Error {
  constructor() {
    super("username already in use");
    this.name = "UsernameAlreadyInUse";
  }
}
