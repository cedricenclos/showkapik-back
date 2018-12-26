import { connect, connection, Document, model, Model, Mongoose, Schema } from 'mongoose'
import { stringify } from 'querystring'

export class MongooseAdapter {
  private streamerModel: Model<Document>

  constructor() {
    this.initStreamerModel()
  }

  public connect(url: string, dbName: string): Promise<Mongoose> {
    connection.on('close', () =>
      console.log(`[Mongoose] : Connection to the database has been closed`)
    )
    return connect(
      `mongodb://${url}/${dbName}`,
      { useNewUrlParser: true }
    )
  }

  public createStreamer(id: string) {
    return this.streamerModel.create({ id })
  }

  public async getSreamer(id: string): Promise<Document | null> {
    return await this.streamerModel.findOne({ id })
  }

  public async getStreamersId(): Promise<Document[]> {
    return await this.streamerModel.find()
  }

  public async updateStreamer(id: string, data: any) {
    return await this.streamerModel.findOneAndUpdate({ id }, data)
  }

  public async deleteStreamer(id: string) {
    return await this.streamerModel.deleteOne({ id })
  }

  private initStreamerModel() {
    this.streamerModel = model(
      'Streamer',
      new Schema({
        id: { type: String, require: true },
        admin: { type: Boolean, default: false },
        youtube: String,
        twitter: String,
      })
    )
  }
}
