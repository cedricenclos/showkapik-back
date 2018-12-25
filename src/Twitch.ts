import TwitchClient, { AccessToken, HelixStream, HelixUser } from 'twitch'
import { UniformObject } from 'twitch/lib/Toolkit/ObjectTools'

export class Twitch {
  private twitchClient: TwitchClient

  constructor(
    clientId: string,
    clientSecret: string,
    accessToken: string = '',
    refreshToken: string = ''
  ) {
    if (accessToken && refreshToken) {
      this.twitchClient = TwitchClient.withCredentials(clientId, accessToken, {
        clientSecret,
        refreshToken,
        onRefresh: (token: AccessToken) => {
          /*Save in bdd the new token for example*/
        },
      })
    } else {
      this.twitchClient = TwitchClient.withCredentials(clientId)
    }
  }

  async getStreamers(): Promise<HelixUser[]> {
    const streamer = ['lpe_glasfeu', 'skollnope', 'myst80', 'lpe_titou', 'barnus88', 'mielodar']

    return await this.twitchClient.helix.users.getUsersByNames(streamer)
  }

  async getStreamer(userName: string): Promise<HelixUser> {
    return await this.twitchClient.helix.users.getUserByName(userName)
  }

  async getStream(userId: string): Promise<HelixStream> {
    return await this.twitchClient.helix.streams.getStreamByUserId(userId)
  }
}
