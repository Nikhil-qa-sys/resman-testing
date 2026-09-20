import { randomUUID } from 'crypto'
import { RequestHandler } from '../../core/request-handler'
import { decodeHtmlEntities, optionValueByText } from '../../helpers/html-form'
import { type BuildingPayload } from '../../helpers/data-generator'

// The page object of the API half: it acts and it returns, the spec decides whether the
// answer is right. It holds every piece of knowledge about how ResMan's Buildings module
// is driven over HTTP — which path, which form keys, how a row is read back out of the
// list markup — so a spec never has to know any of it.
//
// It takes a RequestHandler rather than an APIRequestContext. That is what gives every
// call inside these methods the logging, the status check and the report step for free:
// a client method is domain vocabulary, the handler underneath is the transport.

// What the application answered a save with.
//
// `accepted` is not a convenience reading — it is the only signal ResMan gives. A
// rejected save answers 200 with the New Building form re-rendered, byte for byte the
// same length as a plain GET of that form, carrying no validation message, no echoed
// value and no error class. Observed against qa: an over-length name comes back
// indistinguishable from an untouched form. The one thing that does differ is the
// content type — an accepted save answers JSON with a redirect, a rejected one answers
// the HTML document — so that is what this reads, and it is named here so no spec has to
// know it.
export type BuildingSaveResult = {
  accepted: boolean
  // Where the application sends the browser next; '' when the save was rejected.
  redirect: string
}

// One row of the Buildings list, as the application lists it back.
export type ListedBuilding = {
  name: string
  floors: string
  description: string
}

// The pager's "All" link is page 0, so one request returns every building on the
// property instead of walking 25 rows at a time.
const ALL_PAGES = 0

// The text of one cell of a list row, tags stripped. Scoped to the row the caller already
// isolated: matching a cell against the whole list document runs a lazy match across the
// row boundary and reads the next building's values.
function cellText(rowHtml: string, columnClass: string): string {
  const cell = rowHtml.match(new RegExp(`<td class="${columnClass}">([\\s\\S]*?)</td>`, 'i'))

  return cell ? decodeHtmlEntities(cell[1].replace(/<[^>]*>/g, '')).trim() : ''
}

// The New Building endpoint does not take JSON — it takes the form's own body, and a grid
// row is bound by ASP.NET MVC through keys the browser generates per row. The
// `Buildings.index` marker and the `Buildings[<guid>].<field>` keys are that binding: the
// guid is arbitrary but must be identical in every key of the row. Address.AddressID is
// posted empty because the row is new and the application assigns it.
function buildingFormBody(
  propertyId: string,
  propertyName: string,
  payload: BuildingPayload,
): Record<string, string> {
  const { building } = payload
  const rowKey = randomUUID()

  return {
    PropertyID: propertyId,
    PropertyName: propertyName,
    'Buildings.index': rowKey,
    [`Buildings[${rowKey}].Name`]: building.name,
    [`Buildings[${rowKey}].Floors`]: building.floors,
    [`Buildings[${rowKey}].Description`]: building.description,
    [`Buildings[${rowKey}].Address.StreetAddress`]: building.address.streetAddress,
    [`Buildings[${rowKey}].Address.AddressID`]: '',
    [`Buildings[${rowKey}].Address.City`]: building.address.city,
    [`Buildings[${rowKey}].Address.State`]: building.address.state,
    [`Buildings[${rowKey}].Address.Zip`]: building.address.zip,
  }
}

export class BuildingsApi {
  constructor(private api: RequestHandler) {}

  // The id the application knows a property by, resolved from the name a human uses.
  //
  // There is no property lookup endpoint. The New Building form carries every property
  // the signed-in user may post to as the options of its PropertyID select, so the form
  // that needs the id is also what publishes it. Returns '' when the property is not on
  // the account — which the caller asserts on rather than posting an empty id.
  async getPropertyId(propertyName: string): Promise<string> {
    const formHtml = await this.api.path('/Buildings/New').getRequest(200)

    return optionValueByText(formHtml, 'PropertyID', propertyName)
  }

  // Saves one building against `propertyId` and reports whether the application took it.
  //
  // The status stays the handler's argument, so a transport failure still throws with the
  // request and response attached. What this adds is the application-level outcome, which
  // the status cannot carry: see BuildingSaveResult.
  async addBuilding(
    propertyId: string,
    propertyName: string,
    building: BuildingPayload,
  ): Promise<BuildingSaveResult> {
    const saveResponse = await this.api
      .path('/Buildings/New')
      .form(buildingFormBody(propertyId, propertyName, building))
      .postRequest(200)

    const redirect = typeof saveResponse === 'object' && saveResponse !== null ? saveResponse.redirect : undefined

    return { accepted: typeof redirect === 'string', redirect: redirect ?? '' }
  }

  // The application's own duplicate check, as it answers it.
  //
  // This is what the New Building form calls before it saves, so it answers from the same
  // rule the save enforces: {"empty":true} while the name is free, and
  // {"message":"This building already exists"} once a building holds it. The body is
  // returned rather than a boolean reading of it, so the spec asserts the contract and
  // decides what it means — and so an error payload, which is neither shape, cannot be
  // quietly reduced to "false".
  async getBuildingExists(propertyId: string, name: string): Promise<{ empty?: boolean; message?: string }> {
    return this.api
      .path('/Buildings/BuildingExists')
      .params({ propertyID: propertyId, name })
      .getRequest(200)
  }

  // The row the Buildings list shows for `name`, or undefined when the property lists no
  // such building — which the caller asserts on rather than receiving a default that
  // quietly points somewhere else.
  //
  // Rows are matched on the name cell alone and on the whole value: a name that only
  // appears in another building's Description, or a generated name that is the prefix of
  // a longer one, must not satisfy the caller's assertion. Returning the row's other
  // cells is what lets a spec check the application stored what the save sent, rather
  // than only that something with the right name exists.
  async getBuildingFromList(propertyId: string, name: string): Promise<ListedBuilding | undefined> {
    const listHtml = await this.api
      .path('/Buildings/IndexPageBuildingList')
      .params({ propertyID: propertyId, page: ALL_PAGES })
      .getRequest(200)

    for (const row of listHtml.matchAll(/<tr class="building">([\s\S]*?)<\/tr>/g)) {
      const building = {
        name: cellText(row[1], 'bl-name-col'),
        floors: cellText(row[1], 'bl-floors-col'),
        description: cellText(row[1], 'bl-description-col'),
      }

      if (building.name === name) {
        return building
      }
    }

    return undefined
  }
}
