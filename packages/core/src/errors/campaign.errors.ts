export class CampaignNotFoundError extends Error {
  constructor(message = "Campaign not found") {
    super(message);
    this.name = "CampaignNotFoundError";
  }
}

export class CampaignInvalidStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignInvalidStatusError";
  }
}

export class CampaignAudienceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignAudienceValidationError";
  }
}

export class CampaignLaunchValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignLaunchValidationError";
  }
}

export class CampaignInsufficientCreditsError extends Error {
  constructor(message = "Insufficient credits to launch campaign") {
    super(message);
    this.name = "CampaignInsufficientCreditsError";
  }
}
